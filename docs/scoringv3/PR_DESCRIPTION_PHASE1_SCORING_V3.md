# PR: Phase 1 — Scoring Engine V3 (Schema + Migration + Runbook)

This PR introduces Phase 1 database migration and operational artifacts required to implement Scoring Engine V3 (prototype). Changes are limited to schema additions, helper functions, migration scripts, index creation, deployment scripts, backfill & test plan, and runbook.

Summary of changes

- Schema migrations (transactional): `migration_phase1_scoring_v3_updated.sql`
  - Add columns to `credit_assessments`: `score_collateral`, `confidence_multipliers`, `gcs`, `data_flag`, `fraud_flag`, `hard_block_triggered`, `hard_block_reason`
  - Add columns to `sessions`: `contradiction_count`, `revenue_declared_month`, `gps_source`, `gps_plausibility_score`, `session_attempt_count`
  - Add columns to `business_profiles`: `session_attempt_count`, `last_assessment_at`, `gps_*` fields
  - Add columns to `user_profiles`: `nik_verified`, `phone_verified`
  - Add columns to `documents`: `image_phash`, `exif_meta`, `image_forgery_score`
  - Create `fraud_signals` table (append-only)
  - Create `multiplier_audit` table (audit history)
  - Create helper function `insert_fraud_signal(...)`
  - Revoke PUBLIC write on sensitive tables (fraud_signals, multiplier_audit)

- Indexes & Grants (run OUTSIDE transaction): `migration_phase1_scoring_v3_indexes_and_grants.sql`
  - Create indexes using `CONCURRENTLY` to avoid blocking
  - Grant `EXECUTE` on `insert_fraud_signal` to `service_role`
  - Add an archival helper `archive_old_fraud_signals(p_cutoff TIMESTAMPTZ)`

- Rollback script: `migration_phase1_scoring_v3_rollback_and_backfill.sql`
  - Safe rollback (note: data loss for dropped columns/tables)

- Backfill & Test plan: `backfill_jobs_and_test_plan.md`
  - Pseudocode for computing `image_phash`, `exif_meta`, `image_forgery_score`
  - Pseudocode for recomputing `confidence_multipliers` and `gcs`
  - Detailed test plan (smoke, integration, perf, security)

- Runbook & Deployment script: `phase1_runbook_and_updated_migrations.md`, `deploy_migration_phase1.sh`
  - Step-by-step deployment runbook, safety checks, indexing guidance, retention recommendations
  - `deploy_migration_phase1.sh` to run migration via `psql` using `PG_CONN` environment variable

- Spec & Mitigations (already present): `SCORING_ENGINE_SPEC_V3.md`, `SCORING_V3_MITIGATIONS.md`


Why this change

- Prepares DB to store the data and audit trail necessary for Scoring Engine V3 (confidence multipliers, fraud signals, collateral score)
- Provides safer migration (concurrent index creation) and improved operational guidance for backfill and testing
- Puts in place append-only tables for forensic evidence and auditing


Deployment steps (short)

1. Create staging branch from `develop` (or `main`) and push migration files.
2. Run migration on staging with `PG_CONN` pointing to staging DB.
   - `export PG_CONN="postgres://..."`
   - `./deploy_migration_phase1.sh`
3. Run index & grants script (outside transaction). (deploy script does this)
4. Run backfill jobs for documents (compute phash/exif), then recompute multipliers/GCS for historical assessments.
5. Run full test plan (see `backfill_jobs_and_test_plan.md`).
6. When staging pass, schedule production maintenance window and repeat steps.


CI Job example (GitHub Actions)

```yaml
name: DB Migration Phase1
on: [workflow_dispatch]
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Install psql
        run: sudo apt-get install -y postgresql-client
      - name: Run migration
        env:
          PG_CONN: ${{ secrets.PROD_PG_CONN }}
        run: |
          ./deploy_migration_phase1.sh
```


Testing Checklist (must pass on staging)

- [ ] Migration runs successfully without errors
- [ ] New columns/tables/functions exist
- [ ] Smoke tests: create session, upload document, run calculate-score (response contains `gcs` and `confidence_multipliers`)
- [ ] Backfill job: compute image_phash & exif for a sample doc
- [ ] Recompute multipliers: multiplier_audit entries created
- [ ] Fraud signals: insert via function works; non-service role cannot insert directly
- [ ] RLS tests: user cannot read other user's business_profiles/sessions
- [ ] Concurrency tests for session_attempt_count & contradiction_count
- [ ] Performance test for backfill throughput


Rollback Plan

- Prefer restore from DB snapshot taken before migration
- If snapshot not available: run `migration_phase1_scoring_v3_rollback_and_backfill.sql` (data loss)


Security Notes

- Do NOT expose `service_role` key to clients. Store the key in CI/Secrets and backend env vars only.
- RLS policies enforced; sensitive tables have public write revoked.
- Retention strategy suggested for `fraud_signals` & `multiplier_audit` (archive older than 180 days)


Files included in this PR

- migration_phase1_scoring_v3_updated.sql
- migration_phase1_scoring_v3_indexes_and_grants.sql
- migration_phase1_scoring_v3_rollback_and_backfill.sql
- backfill_jobs_and_test_plan.md
- phase1_runbook_and_updated_migrations.md
- deploy_migration_phase1.sh


Labels & Reviewers (suggested)

- Labels: `db-migration`, `security`, `high-impact`, `needs-testing`
- Reviewers: `@backend-lead`, `@dba`, `@security-engineer`, `@product-owner`


Notes for reviewers

- Migration adds many new columns/tables but is additive (no destructive changes). We attempt to be safe by performing index creation concurrently.
- The backfill currently contains conservative defaults; for precise recomputation, prefer application-level backfill to reuse scoring logic.


If you approve, merge and then run the CI migration job in a controlled window. Thank you.
