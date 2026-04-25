# Backfill Jobs & Test Plan — Phase 1 Scoring V3

This file contains:
- Backfill job pseudocode to compute document pHash/EXIF and image_forgery_score
- Backfill job pseudocode to recompute confidence_multipliers and GCS for historical credit_assessments
- Detailed test plan for Phase 1 migration validation

---

## A. Backfill Job 1 — Documents: compute pHash, EXIF, & image_forgery_score

Purpose: for existing documents in `documents` table, compute image PHASH (perceptual hash), extract EXIF metadata, and run a lightweight forgery heuristic (image_forgery_score) and store into documents table.

Operational notes:
- Run as background job in batches (e.g., 500 docs per job) to avoid heavy CPU/IO.
- Use worker pool (e.g., Kubernetes job, Cloud Function) with concurrency limit.
- For PDFs, extract images/page thumbnails first.
- If file_url points to remote storage (Supabase), stream file; do not download entire set at once.

Pseudocode (Python-like):

```python
BATCH_SIZE = 500

def compute_phash_exif_for_doc(doc):
    file_stream = download_file(doc.file_url)
    if not file_stream:
        return {'status':'error','reason':'download_failed'}

    # 1) EXIF
    exif = extract_exif(file_stream)  # returns dict or None

    # 2) pHash
    phash = compute_perceptual_hash(file_stream)  # e.g., imagehash.phash

    # 3) forgery heuristics
    forgery_score = compute_forgery_score(file_stream, exif)  # 0.0..1.0

    # 4) update DB
    UPDATE documents SET image_phash = phash, exif_meta = to_jsonb(exif), image_forgery_score = forgery_score
      WHERE id = doc.id;

    return {'status':'ok', 'id': doc.id}


def backfill_documents():
    offset = 0
    while True:
        docs = query("SELECT id, file_url FROM documents WHERE (image_phash IS NULL OR exif_meta IS NULL) LIMIT %s OFFSET %s", (BATCH_SIZE, offset))
        if not docs: break

        for doc in docs:
            try:
                compute_phash_exif_for_doc(doc)
            except Exception as e:
                log_error(doc.id, str(e))

        offset += BATCH_SIZE

    log_info('document backfill complete')
```

Forged image heuristics (simple starting rules):
- If EXIF missing -> small penalty (0.05)
- If EXIF datetime is far from upload timestamp (>30 days) -> penalty (0.1)
- If compression artifacts & multiple resaves detected -> penalty (0.2)
- If phash matches an existing doc used in >3 different business_profiles -> penalty (0.5)

Combine penalties into `image_forgery_score` in [0,1]. Tune thresholds over time.

---

## B. Backfill Job 2 — Recompute confidence_multipliers & GCS for historical credit_assessments

Purpose: After document forensic fields and other session fields exist, recompute confidence_multipliers for each historical assessment so older assessments have proper audit trail.

Operational notes:
- This job depends on documents backfill completion for reliable results.
- Run in batches; recomputation CPU-light if logic is pure arithmetic.
- Keep a multiplier_audit entry per assessment recalculation.

Pseudocode:

```python
BATCH_SIZE = 200

def compute_multipliers_for_assessment(assessment_id):
    # Fetch assessment + joined session + docs + business_profile
    assessment = get_assessment_with_session_docs(assessment_id)

    # Example logic (simplified):
    m_fin = compute_m_financial(assessment, session, docs)
    m_col = compute_m_collateral(assessment, session, docs)
    m_exp = compute_m_experience(assessment, session, docs)
    m_loc = compute_m_location(assessment, session)
    m_ch  = compute_m_character(assessment, session, docs)

    multipliers = {
        'financial': round(m_fin, 2),
        'collateral': round(m_col, 2),
        'experience': round(m_exp, 2),
        'location': round(m_loc, 2),
        'character': round(m_ch, 2)
    }

    gcs = (m_fin * 0.40) + (m_col * 0.25) + (m_exp * 0.15) + (m_loc * 0.10) + (m_ch * 0.10)

    # Update assessment and write multiplier audit
    UPDATE credit_assessments SET confidence_multipliers = multipliers::jsonb, gcs = gcs
      WHERE id = assessment_id;

    INSERT INTO multiplier_audit (assessment_id, multipliers, reason)
      VALUES (assessment_id, multipliers::jsonb, 'backfill recompute');

    return True


def backfill_assessments():
    offset = 0
    while True:
        assessments = query("SELECT id FROM credit_assessments ORDER BY created_at ASC LIMIT %s OFFSET %s", (BATCH_SIZE, offset))
        if not assessments: break

        for a in assessments:
            try:
                compute_multipliers_for_assessment(a.id)
            except Exception as e:
                log_error(a.id, str(e))

        offset += BATCH_SIZE

    log_info('assessment backfill complete')
```

Notes:
- `compute_m_financial` uses rules: OCR delta checks, presence of verified QRIS/bank links, doc_count, etc.
- If documents missing, set multipliers conservatively (e.g., 0.8) and record reason in multiplier_audit.

---

## C. Test Plan — Detailed Cases

Goal: ensure migration is correct, new fields exist and are used by scoring logic, and new API contract returns expected fields.

Environment: run on staging DB snapshot. Use service_role credentials.

### C.1 Smoke tests (automated)
1. Run migration script on staging; verify no errors.
2. Run `SELECT` to confirm columns/tables exist.
3. Create test user, business profile, and session; upload a small image doc; run compute_phash_exif_for_doc for that doc; verify documents.image_phash, exif_meta set.
4. Run `POST /calculate-score` (dev instance) with sample session; verify response contains `confidence_multipliers`, `gcs`, `fraud_flag`, and `fraud_signals` if applicable.

### C.2 Functional tests (unit/integration)
1. Contradiction counter increment
   - Simulate chat history: user says revenue 10M, later says 20M. Run extraction and ensure sessions.contradiction_count increments.
2. GPS plausibility
   - Submit session with device_gps near Jakarta, manual_pin in neighboring city 20km away. Ensure gps_plausibility_score < 0.5 and M_location reduced.
3. Document forensic
   - Upload same image to two different business_profiles; compute phash; ensure phash equal and forgery penalty applied if reused >3 times.
4. Fraud flag & soft cap
   - Create assessment where OCR delta > 50% -> M_financial=0.5 and final score computed then capped to max 579.
5. Multiplier audit
   - After recompute, multiplier_audit contains an entry for the assessment_id with multipliers JSON.

### C.3 Performance tests
1. Backfill throughput
   - Run document backfill job on copy of production storage; measure throughput and estimated completion time.
2. Index performance
   - Run common queries (dashboard queries, recent_assessments, sessions per business). Check explain analyze and ensure indexes used.

### C.4 Security & RLS tests
1. Role restrictions
   - As unprivileged user, attempt to insert into fraud_signals -> must be denied.
   - As service_role, call insert_fraud_signal -> allowed.
2. RLS: cross-user data access
   - Ensure user A cannot read business_profiles or sessions of user B.

### C.5 Edge tests
1. Large numbers
   - revenue > 1B, system must not overflow; proper validation should have blocked it.
2. Missing data
   - Session with only revenue present; scoring should run with defaults and produce final_score in 300–850 range.
3. High-concurrency
   - Create multiple sessions concurrently for same business; ensure session_attempt_count increments correctly (transactionally).

---

## D. Rollback considerations & safe deployment

- Always backup DB snapshot before running migration.
- Run in staging first, run test plan, then run in production during low-traffic window.
- Migrate in two steps if necessary: (1) add columns & tables, (2) enable application logic that uses them. This allows rollback of app changes without losing data (columns remain but unused).
- If rollback required: use migration_phase1_scoring_v3_rollback_and_backfill.sql — note it drops data.

---

If kamu setuju, aku akan present file ini dan juga present the rollback SQL file. Setelah itu aku bisa langsung generate CI migration scripts or database change steps for Supabase.
