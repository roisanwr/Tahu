# Phase 1 Runbook — Scoring V3 Migration

Dokumen ini berisi runbook deployment langkah demi langkah, updated migration SQL notes (concurrent indexes, grants, retention), backfill SQL job untuk mapping score_document → score_collateral dan recomputasi multipliers/GCS, serta test checklist eksekusi.

File terkait yang sudah dibuat:
- migration_phase1_scoring_v3.sql (initial migration)
- migration_phase1_scoring_v3_rollback_and_backfill.sql (rollback)
- backfill_jobs_and_test_plan.md (detailed backfill pseudocode & tests)
- SCORING_ENGINE_SPEC_V3.md (spec)
- SCORING_V3_MITIGATIONS.md (mitigations)

---

## A. High-Level Steps (safe deployment)
1. Prepare: take DB snapshot / backup
2. Run migration in staging (apply migration_phase1_scoring_v3.sql)
3. Run post-migration schema checks (verify tables/columns/indexes)
4. Deploy application changes (do not enable new features that rely on new fields yet) to ensure compatibility
5. Run backfill jobs in controlled rate (documents phash/exif → then assessments multipliers)
6. Run full test plan from backfill_jobs_and_test_plan.md
7. Production migration: repeat steps 1–6 in prod with maintenance window
8. Switch application logic to use new fields and features

---

## B. Updated Migration SQL Notes (what to change/add to migration_phase1_scoring_v3.sql)
Make these adjustments to improve safety and operational robustness.

1) CREATE INDEX CONCURRENTLY where possible (non-blocking on large tables)
- Use `CREATE INDEX CONCURRENTLY idx_documents_phash ON documents(image_phash);`
- Note: CONCURRENTLY cannot run inside a transaction block. Split index creation into separate migration step outside BEGIN/COMMIT.

2) Add GRANTs for insert_fraud_signal and safe write privileges
- Add after function creation:
  GRANT EXECUTE ON FUNCTION insert_fraud_signal(UUID, UUID, UUID, TEXT, TEXT, JSONB) TO service_role;
- Ensure service_role is the DB role used by backend to write sensitive tables.

3) Add retention policy for fraud_signals and multiplier_audit
- Option A (partition by created_at monthly) — recommended for high-volume
- Option B (periodic archival job) — easier for prototype

Example partition scheme (simpler):
```sql
-- Create partitioned table
CREATE TABLE fraud_signals_partitioned (
  LIKE fraud_signals INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create migration job to copy existing rows into partitioned table, swap names, or use direct creation on new systems.
```

4) Add policy to prevent DELETE on fraud_signals & multiplier_audit
- Create RLS policy or DB trigger to prevent DELETE by non-admin roles

5) Add NOT VALID on heavy CHECK constraints (if adding to large tables)
- e.g., `ADD CONSTRAINT ... NOT VALID;` then `VALIDATE CONSTRAINT` later.

6) Concurrency on counters
- For `session_attempt_count` and `contradiction_count` ensure updates are `UPDATE ... SET session_attempt_count = session_attempt_count + 1 WHERE id = ... RETURNING session_attempt_count;` inside a short transaction.

---

## C. Backfill SQL Job — Map score_document -> score_collateral and recompute multipliers/GCS

This SQL batch job runs in manageable chunks and recomputes new fields based on historical data.

Important: This job assumes documents backfill (phash/exif) has completed for relevant documents.

Pseudocode as SQL + plpgsql worker function:

```sql
-- 1) Helper function to compute asset_coverage_ratio -> score_collateral value
CREATE OR REPLACE FUNCTION compute_score_collateral_from_session(p_session_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_revenue BIGINT;
  v_assets BIGINT;
  v_ratio FLOAT;
  v_score INTEGER;
BEGIN
  SELECT monthly_revenue INTO v_revenue FROM sessions WHERE id = p_session_id;
  SELECT assets_estimate INTO v_assets FROM sessions WHERE id = p_session_id;
  IF v_revenue IS NULL OR v_revenue = 0 THEN
    v_score := 0;
  ELSE
    v_ratio := v_assets::float / (v_revenue::float * 12.0);
    v_score := LEAST(100, GREATEST(0, FLOOR((v_ratio / 1.5) * 100)));
  END IF;

  -- write into assessments if exists
  UPDATE credit_assessments
  SET score_collateral = v_score
  WHERE session_id = p_session_id;
END;
$$;

-- 2) Worker to process assessments in batches
CREATE OR REPLACE FUNCTION backfill_assessments_batch(p_limit INT DEFAULT 200)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
  processed INT := 0;
BEGIN
  FOR rec IN
    SELECT ca.session_id FROM credit_assessments ca
    WHERE ca.score_collateral IS NULL
    LIMIT p_limit
  LOOP
    PERFORM compute_score_collateral_from_session(rec.session_id);

    -- recompute multipliers and gcs via application function or an SQL function (pseudocode)
    -- For simplicity, record a conservative default multiplier when doc evidence missing
    UPDATE credit_assessments SET confidence_multipliers = jsonb_build_object(
       'financial', 0.80, 'collateral', 0.60, 'experience', 0.85, 'location', 0.90, 'character', 0.80
     ),
     gcs = 0.80
    WHERE session_id = rec.session_id;

    INSERT INTO multiplier_audit (assessment_id, multipliers, reason)
      SELECT id, confidence_multipliers, 'backfill default multipliers' FROM credit_assessments WHERE session_id = rec.session_id;

    processed := processed + 1;
  END LOOP;

  RETURN processed;
END;
$$;

-- 3) Example invocation: run backfill_assessments_batch() repeatedly until it returns 0
```

Notes:
- This SQL-based backfill applies conservative default multipliers; a more accurate recompute should call application scoring logic (recommended) because multipliers rely on complex heuristics (OCR deltas, external verifications).
- For production-quality backfill, implement backfill worker in application code to reuse scoring logic and avoid duplication.

---

## D. Test Checklist (executable step-by-step)

Pre-requisites: staging DB snapshot taken; service_role environment variable set; queue workers ready.

1) Schema & migration verification
- [ ] Apply migration to staging
- [ ] Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'credit_assessments'` and ensure new columns exist
- [ ] Verify function insert_fraud_signal exists: `SELECT proname FROM pg_proc WHERE proname='insert_fraud_signal'`.

2) Basic smoke tests
- [ ] Create user + business + session via API
- [ ] Upload sample document via POST /upload-document and ensure DB row under documents with file_url created
- [ ] Call backfill job for documents (or run local compute_phash on that doc); check documents.image_phash & exif_meta not null
- [ ] Call POST /calculate-score; verify response contains confidence_multipliers and gcs fields

3) Fraud_signal and audit tests
- [ ] Simulate OCR delta > 50% for a session and ensure insert_fraud_signal is called, fraud_flag set true, and final_score capped
- [ ] Insert a fraud_signal via function as service_role and verify non-service user cannot insert directly (permission test)

4) Concurrency & atomicity tests
- [ ] Simulate 10 concurrent session creation attempts for same business_id; ensure session_attempt_count increments correctly and throttle policies apply
- [ ] Simulate parallel contradictions (multiple messages) that increment contradiction_count concurrently

5) Backfill tests
- [ ] Run backfill_assessments_batch() on small batch; verify score_collateral populated and multiplier_audit entries created

6) Performance tests
- [ ] Measure backfill throughput and adjust worker concurrency
- [ ] Ensure fraud_signals table grows as expected; run retention/archival dry run

7) Security tests
- [ ] RLS test: As user B attempt to read business_profiles of user A -> expect denied
- [ ] Attempt to delete fraud_signals as service user with limited privilege -> expect denied

---

## E. Rollback Plan (if things go wrong)
1) Stop application traffic (maintenance mode)
2) Restore DB snapshot from before migration (fastest and cleanest) — recommended if new application code was already deployed
3) If restore not possible, run migration_phase1_scoring_v3_rollback_and_backfill.sql but note data loss (documents phash, multiplier audits, fraud_signals dropped)

---

## F. Operational Notes & Recommendations
- Prefer to do index creation (CONCURRENTLY) in a separate deployment step outside transaction
- Use application backfill workers rather than pure-sql for multipliers recomputation to reuse scoring logic
- Monitor table sizes for fraud_signals & multiplier_audit and create partitioning policy if growth is high
- Centralize writes to fraud_signals via DB function insert_fraud_signal to ease auditing

---

Jika kamu setuju, aku akan:
- Update migration SQL file to apply CONCURRENTLY index creation in separate step and add GRANT EXECUTE to the appropriate service role (kamu sebutkan nama role),
- Generate an idempotent deployment script (bash) that runs schema migration, then concurrently creates indexes, then deploys backfill jobs,
- Dan siapkan PR description text untuk repo yang merangkum perubahan.

Mau aku lanjutkan dengan update migration SQL dan deployment script sekarang? If yes, sebutkan nama DB service role yang dipakai (contoh: 'service_role').