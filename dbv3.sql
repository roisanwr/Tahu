-- ============================================================
-- DB SCHEMA FINAL V3.1 — UMKM Credit Scoring Platform
-- Supabase PostgreSQL 15+
-- Consolidated: April 2026
--
-- Includes:
--   Base Schema V3 (Multi-Bisnis per User)
--   + Phase 1 Scoring Engine V3 Migration
--   + Indexes, Grants, Fraud Detection, Forensics
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- SECTION 1: user_profiles
-- ============================================================
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  nik         VARCHAR(16) UNIQUE,
  phone       TEXT,
  email       TEXT,
  role        TEXT DEFAULT 'umkm' CHECK (role IN ('umkm', 'admin', 'lender')),
  avatar_url  TEXT,
  -- V3.1: KYC verification
  nik_verified   BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: business_profiles
-- ============================================================
CREATE TABLE business_profiles (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  business_name             TEXT NOT NULL,
  owner_name                TEXT,
  category                  TEXT,
  description               TEXT,
  years_operating           FLOAT,
  employee_count            INTEGER,
  has_fixed_location        BOOLEAN DEFAULT FALSE,
  location_address          TEXT,
  location_point            GEOGRAPHY(POINT, 4326),
  has_prev_loan             BOOLEAN DEFAULT FALSE,
  prev_loan_amount          BIGINT,
  prev_loan_status          TEXT CHECK (prev_loan_status IN ('lunas', 'cicilan_lancar', 'macet', 'belum_ada')),
  additional_data           JSONB,
  is_active                 BOOLEAN DEFAULT TRUE,
  -- V3.1: attempt tracking & GPS verification
  session_attempt_count     INTEGER DEFAULT 0,
  last_assessment_at        TIMESTAMPTZ,
  gps_last_verified_at      TIMESTAMPTZ,
  gps_verification_method   TEXT CHECK (gps_verification_method IN ('device','manual','none')) DEFAULT 'none',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_user_id        ON business_profiles(user_id);
CREATE INDEX idx_business_location_point ON business_profiles USING GIST(location_point);
CREATE INDEX idx_business_is_active      ON business_profiles(is_active);
CREATE INDEX idx_business_session_attempt_count ON business_profiles(session_attempt_count);

-- ============================================================
-- SECTION 3: sessions
-- ============================================================
CREATE TABLE sessions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  business_id               UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  status                    TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  mode                      TEXT DEFAULT 'basic' CHECK (mode IN ('basic', 'advanced')),
  interview_stage           TEXT DEFAULT 'intro' CHECK (
    interview_stage IN ('intro', 'profil', 'keuangan', 'dokumen', 'geolokasi', 'summary')
  ),
  progress_pct              INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  monthly_revenue           BIGINT,
  monthly_expense           BIGINT,
  transaction_frequency_daily INTEGER,
  assets_estimate           BIGINT,
  main_revenue_source       TEXT,
  -- V3.1: anti-abuse & runtime data
  contradiction_count       INTEGER DEFAULT 0,
  revenue_declared_month    INTEGER CHECK (revenue_declared_month BETWEEN 1 AND 12),
  gps_source                TEXT CHECK (gps_source IN ('auto_device','manual_pin','text_only','none')) DEFAULT 'none',
  gps_plausibility_score    FLOAT CHECK (gps_plausibility_score BETWEEN 0.0 AND 1.0) DEFAULT 0.0,
  session_attempt_count     INTEGER DEFAULT 0,
  expires_at                TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id              ON sessions(user_id);
CREATE INDEX idx_sessions_business_id          ON sessions(business_id);
CREATE INDEX idx_sessions_status               ON sessions(status);
CREATE INDEX idx_sessions_contradiction_count  ON sessions(contradiction_count);
CREATE INDEX idx_sessions_revenue_declared_month ON sessions(revenue_declared_month);

-- ============================================================
-- SECTION 4: chat_history
-- ============================================================
CREATE TABLE chat_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content        TEXT NOT NULL,
  message_type   TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'ui_component')),
  extracted_data JSONB,
  ui_trigger     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_created_at ON chat_history(created_at);

-- ============================================================
-- SECTION 5: documents (+ V3.1 forensics)
-- ============================================================
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL CHECK (doc_type IN (
    'nota','struk','ktp','buku_kas','rekening_koran',
    'foto_usaha','screenshot_marketplace','video_pitching','other'
  )),
  media_type     TEXT DEFAULT 'document' CHECK (media_type IN ('document', 'image', 'video')),
  file_url       TEXT NOT NULL,
  file_size      INTEGER,
  ocr_status     TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
  ocr_result     JSONB,
  ocr_confidence FLOAT CHECK (ocr_confidence BETWEEN 0.0 AND 1.0),
  ocr_raw_text   TEXT,
  -- V3.1: image forensics
  image_phash         TEXT,
  exif_meta           JSONB,
  image_forgery_score FLOAT CHECK (image_forgery_score BETWEEN 0.0 AND 1.0) DEFAULT 0.0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_doc_type   ON documents(doc_type);
CREATE INDEX idx_documents_phash      ON documents(image_phash);

-- ============================================================
-- SECTION 6: credit_assessments (+ V3.1 scoring additions)
-- ============================================================
CREATE TABLE credit_assessments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  final_score          INTEGER CHECK (final_score BETWEEN 300 AND 850),
  risk_level           TEXT CHECK (risk_level IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),
  score_financial      INTEGER CHECK (score_financial BETWEEN 0 AND 100),
  score_experience     INTEGER CHECK (score_experience BETWEEN 0 AND 100),
  score_location       INTEGER CHECK (score_location BETWEEN 0 AND 100),
  score_document       INTEGER CHECK (score_document BETWEEN 0 AND 100),
  score_character      INTEGER CHECK (score_character BETWEEN 0 AND 100),
  -- V3.1: collateral score
  score_collateral     INTEGER CHECK (score_collateral BETWEEN 0 AND 100),
  -- V3.1 weights (updated defaults)
  weights              JSONB DEFAULT '{"financial":0.40,"collateral":0.25,"experience":0.15,"location":0.10,"character":0.10}',
  -- V3.1: confidence & flags
  confidence_multipliers JSONB,
  gcs                  FLOAT CHECK (gcs BETWEEN 0.0 AND 1.0),
  data_flag            TEXT CHECK (data_flag IN ('sufficient','limited','insufficient')),
  fraud_flag           BOOLEAN DEFAULT FALSE,
  hard_block_triggered BOOLEAN DEFAULT FALSE,
  hard_block_reason    TEXT,
  explanation          TEXT,
  loan_eligible        BOOLEAN DEFAULT FALSE,
  loan_max_amount      BIGINT,
  loan_tenor_months    INTEGER,
  loan_interest_range  TEXT,
  raw_extracted_data   JSONB,
  sentiment_analysis   JSONB,
  consistency_check    JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: geospatial_scores
-- ============================================================
CREATE TABLE geospatial_scores (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  location_score          INTEGER CHECK (location_score BETWEEN 0 AND 100),
  market_proximity_score  INTEGER CHECK (market_proximity_score BETWEEN 0 AND 100),
  market_nearest_name     TEXT,
  market_distance_km      FLOAT,
  business_density_score  INTEGER CHECK (business_density_score BETWEEN 0 AND 100),
  business_count_500m     INTEGER,
  infrastructure_score    INTEGER CHECK (infrastructure_score BETWEEN 0 AND 100),
  road_access             BOOLEAN,
  bank_nearby             BOOLEAN,
  raw_factors             JSONB,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geospatial_session_id ON geospatial_scores(session_id);

-- ============================================================
-- SECTION 8: fraud_signals (V3.1, append-only)
-- ============================================================
CREATE TABLE fraud_signals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  severity    TEXT CHECK (severity IN ('low','medium','high','critical')) DEFAULT 'medium',
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_signals_session_id  ON fraud_signals(session_id);
CREATE INDEX idx_fraud_signals_business_id ON fraud_signals(business_id);
CREATE INDEX idx_fraud_signals_user_id     ON fraud_signals(user_id);

REVOKE ALL ON fraud_signals FROM PUBLIC;

-- ============================================================
-- SECTION 9: multiplier_audit (V3.1)
-- ============================================================
CREATE TABLE multiplier_audit (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES credit_assessments(id) ON DELETE CASCADE,
  multipliers   JSONB,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_multiplier_audit_assessment_id ON multiplier_audit(assessment_id);

REVOKE ALL ON multiplier_audit FROM PUBLIC;

-- ============================================================
-- SECTION 10: RLS Policies
-- Chain: user → business_profiles → sessions → child tables
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: akses milik sendiri" ON user_profiles
  FOR ALL USING (auth.uid() = id);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_profiles: akses milik sendiri" ON business_profiles
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: akses milik sendiri" ON sessions
  FOR ALL USING (
    business_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_history: akses via session milik sendiri" ON chat_history
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents: akses via session milik sendiri" ON documents
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE credit_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_assessments: akses via session milik sendiri" ON credit_assessments
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE geospatial_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "geospatial_scores: akses via session milik sendiri" ON geospatial_scores
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- ============================================================
-- SECTION 11: Triggers & Functions
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_credit_assessments_updated_at
  BEFORE UPDATE ON credit_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- V3.1: helper function to insert fraud signals
CREATE OR REPLACE FUNCTION insert_fraud_signal(
  p_session_id UUID, p_business_id UUID, p_user_id UUID,
  p_type TEXT, p_severity TEXT, p_details JSONB
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID := uuid_generate_v4();
BEGIN
  INSERT INTO fraud_signals(id, session_id, business_id, user_id, signal_type, severity, details)
  VALUES (v_id, p_session_id, p_business_id, p_user_id, p_type, p_severity, p_details);
  RETURN v_id;
END;
$$;

-- Grant execute to service_role (run as admin)
-- GRANT EXECUTE ON FUNCTION insert_fraud_signal(UUID,UUID,UUID,TEXT,TEXT,JSONB) TO service_role;

-- V3.1: archiving old fraud signals (for scheduled CRON job)
CREATE OR REPLACE FUNCTION archive_old_fraud_signals(p_cutoff TIMESTAMPTZ)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  v_count INT := 0;
BEGIN
  CREATE TABLE IF NOT EXISTS fraud_signals_archive (LIKE fraud_signals INCLUDING ALL);
  INSERT INTO fraud_signals_archive SELECT * FROM fraud_signals WHERE created_at < p_cutoff;
  v_count := (SELECT count(*) FROM fraud_signals WHERE created_at < p_cutoff);
  DELETE FROM fraud_signals WHERE created_at < p_cutoff;
  RETURN v_count;
END;
$$;
-- Usage: SELECT archive_old_fraud_signals(now() - interval '180 days');

-- ============================================================
-- SECTION 12: Views
-- ============================================================

CREATE OR REPLACE VIEW recent_fraud_signals AS
  SELECT id, session_id, business_id, user_id, signal_type, severity, details, created_at
  FROM fraud_signals
  WHERE created_at >= now() - interval '90 days'
  ORDER BY created_at DESC;

-- ============================================================
-- SECTION 13: Common Query Patterns (V3.1)
--
-- [A] Semua bisnis milik seorang user:
--   SELECT * FROM business_profiles
--   WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC;
--
-- [B] History assessment per bisnis:
--   SELECT s.*, ca.final_score, ca.risk_level
--   FROM sessions s LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   WHERE s.business_id = $1 ORDER BY s.created_at DESC;
--
-- [C] Skor terbaru per bisnis (dashboard overview):
--   SELECT DISTINCT ON (s.business_id)
--     bp.business_name, ca.final_score, ca.risk_level, s.created_at
--   FROM credit_assessments ca
--   JOIN sessions s ON ca.session_id = s.id
--   JOIN business_profiles bp ON s.business_id = bp.id
--   WHERE bp.user_id = $1
--   ORDER BY s.business_id, s.created_at DESC;
--
-- [D] Detail lengkap satu sesi:
--   SELECT s.*, bp.business_name, bp.category, bp.location_address,
--     ca.final_score, ca.risk_level, ca.score_financial, ca.score_collateral,
--     ca.score_experience, ca.score_location, ca.score_document, ca.score_character,
--     ca.confidence_multipliers, ca.gcs, ca.data_flag, ca.fraud_flag,
--     ca.hard_block_triggered, ca.explanation, ca.loan_eligible,
--     ca.loan_max_amount, ca.loan_tenor_months, ca.loan_interest_range,
--     gs.location_score, gs.market_nearest_name, gs.market_distance_km
--   FROM sessions s
--   JOIN business_profiles bp ON s.business_id = bp.id
--   LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   LEFT JOIN geospatial_scores gs ON gs.session_id = s.id
--   WHERE s.id = $1 AND bp.user_id = auth.uid();
--
-- ============================================================
-- END OF SCHEMA V3.1
-- ============================================================