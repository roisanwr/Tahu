-- ============================================================
-- DB SCHEMA FINAL V3.2 — UMKM Credit Scoring Platform (TAHU)
-- Supabase PostgreSQL 15+
-- Updated: April 2026
--
-- Changelog dari V3.1:
--   + sessions.last_active_at          (flowchat session resume)
--   + sessions.resume_reason            (network_error|intentional_pause)
--   + sessions.financial_snapshot       (JSONB snapshot extracted financial data)
--   + sessions.has_multiple_months      (F2 scoring input)
--   + sessions.photo_condition_score    (dari AI image analysis foto usaha)
--   + sessions.emotional_signal         (wellbeing concern flag)
--   + sessions.injection_attempt_count  (security tracking)
--   + sessions.off_topic_count          (behavioral tracking)
--   + business_profiles.has_wa_business        (E2 scoring)
--   + business_profiles.marketplace_platform   (CH1 scoring)
--   + business_profiles.marketplace_url
--   + business_profiles.marketplace_rating     (CH1 scoring)
--   + business_profiles.marketplace_review_count (CH1 scoring)
--   + business_profiles.marketplace_monthly_orders (CH1 scoring)
--   + business_profiles.socmed_followers        (CH1 scoring)
--   + business_profiles.has_qris                (F3 scoring)
--   + business_profiles.qris_verified           (F3 scoring)
--   + business_profiles.has_ewallet             (F3 scoring)
--   + business_profiles.ewallet_platforms       (TEXT[] — list platform)
--   + business_profiles.bank_linked             (F3 scoring)
--   + business_profiles.asset_type              (C1 scoring)
--   + business_profiles.loan_count              (E3 scoring)
--   + business_profiles.years_since_last_loan   (E3 scoring)
--   + business_profiles.gps_verified            (M_location multiplier)
--   + business_profiles.psychometric_completed  (CH3 scoring)
--   + business_profiles.psychometric_score      (CH3 scoring)
--   + business_profiles.psychometric_responses  (JSONB — raw responses)
--   + credit_assessments.updated_fields_log     (audit trail revisi user)
--   + credit_assessments.psikometrik_results    (JSONB raw psikometrik)
--   + credit_assessments.raw_scores             (JSONB — breakdown sub-component)
--   + credit_assessments.character_analysis_raw (JSONB — contradiction highlights)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- SECTION 1: user_profiles
-- ============================================================
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  nik             VARCHAR(16) UNIQUE,
  phone           TEXT,
  email           TEXT,
  role            TEXT DEFAULT 'umkm' CHECK (role IN ('umkm', 'admin', 'lender')),
  avatar_url      TEXT,
  -- KYC verification flags
  nik_verified    BOOLEAN DEFAULT FALSE,
  phone_verified  BOOLEAN DEFAULT FALSE,
  email_verified  BOOLEAN DEFAULT FALSE,
  -- Security: track if account was suspended due to fraud
  is_active       BOOLEAN DEFAULT TRUE,
  suspended_at    TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- ============================================================
-- SECTION 2: business_profiles
-- ============================================================
CREATE TABLE business_profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- === STAGE 1–2: Identitas & Profil Usaha ===
  business_name               TEXT NOT NULL,
  owner_name                  TEXT,
  category                    TEXT CHECK (category IN (
    'kuliner', 'retail', 'jasa', 'online', 'produksi', 'lainnya'
  )),
  description                 TEXT,

  -- === STAGE 2: Profil Usaha Detail ===
  years_operating             FLOAT,                        -- E1 scoring
  employee_count              INTEGER,                      -- E2 scoring
  has_fixed_location          BOOLEAN DEFAULT FALSE,        -- C2 scoring
  has_wa_business             BOOLEAN DEFAULT FALSE,        -- E2 scoring bonus
  location_address            TEXT,
  location_point              GEOGRAPHY(POINT, 4326),       -- PostGIS GPS point

  -- === STAGE 3: Riwayat Pinjaman (E3 scoring) ===
  has_prev_loan               BOOLEAN DEFAULT FALSE,
  prev_loan_amount            BIGINT,
  prev_loan_status            TEXT CHECK (prev_loan_status IN (
    'lunas', 'cicilan_lancar', 'macet', 'belum_ada'
  )),
  loan_count                  INTEGER DEFAULT 0,            -- total pinjaman pernah diambil
  years_since_last_loan       FLOAT,                        -- E3 recency bonus

  -- === STAGE 6: Enrichment — Marketplace (CH1 scoring) ===
  marketplace_platform        TEXT,                         -- 'shopee','tokopedia','tiktok','lazada', dll
  marketplace_url             TEXT,
  marketplace_rating          FLOAT CHECK (marketplace_rating BETWEEN 0.0 AND 5.0),
  marketplace_review_count    INTEGER DEFAULT 0,
  marketplace_monthly_orders  INTEGER DEFAULT 0,
  socmed_followers            INTEGER DEFAULT 0,            -- total followers sosmed

  -- === STAGE 6: Enrichment — Digital Payment (F3 scoring) ===
  has_qris                    BOOLEAN DEFAULT FALSE,
  qris_verified               BOOLEAN DEFAULT FALSE,        -- verified via merchant API
  has_ewallet                 BOOLEAN DEFAULT FALSE,
  ewallet_platforms           TEXT[],                       -- contoh: ARRAY['gopay','ovo','dana']
  bank_linked                 BOOLEAN DEFAULT FALSE,        -- OAuth bank verified

  -- === Stage 5: Foto Usaha — Asset (C1, C2 scoring) ===
  asset_type                  TEXT DEFAULT 'mixed' CHECK (asset_type IN (
    'property', 'vehicle', 'equipment', 'inventory', 'mixed'
  )),

  -- === STAGE 6: Psikometrik (CH3 scoring — Advanced mode) ===
  psychometric_completed      BOOLEAN DEFAULT FALSE,
  psychometric_score          FLOAT CHECK (psychometric_score BETWEEN 0.0 AND 100.0),
  psychometric_responses      JSONB,                        -- raw jawaban per pertanyaan

  -- === GPS Verification (M_location multiplier) ===
  gps_verified                BOOLEAN DEFAULT FALSE,        -- true = GPS widget, false = teks manual
  gps_last_verified_at        TIMESTAMPTZ,
  gps_verification_method     TEXT CHECK (gps_verification_method IN (
    'device', 'manual', 'none'
  )) DEFAULT 'none',

  -- === Metadata ===
  additional_data             JSONB,                        -- catch-all untuk data tambahan
  is_active                   BOOLEAN DEFAULT TRUE,
  session_attempt_count       INTEGER DEFAULT 0,
  last_assessment_at          TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_user_id          ON business_profiles(user_id);
CREATE INDEX idx_business_location_point   ON business_profiles USING GIST(location_point);
CREATE INDEX idx_business_is_active        ON business_profiles(is_active);
CREATE INDEX idx_business_category         ON business_profiles(category);
CREATE INDEX idx_business_session_attempt  ON business_profiles(session_attempt_count);
CREATE INDEX idx_business_marketplace      ON business_profiles(marketplace_platform);

-- ============================================================
-- SECTION 3: sessions
-- ============================================================
CREATE TABLE sessions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  business_id                 UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,

  -- === Session State ===
  status                      TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'pending_score', 'completed', 'expired', 'abandoned', 'blocked'
  )),
  mode                        TEXT DEFAULT 'basic' CHECK (mode IN ('basic', 'advanced')),
  interview_stage             TEXT DEFAULT 'intro' CHECK (interview_stage IN (
    'intro', 'profil', 'keuangan', 'dokumen', 'geolokasi', 'summary'
  )),
  progress_pct                INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  -- === Resume Logic (NUSA_CHAT_FLOW_MASTER_SPEC.md — Multi-Session Resume) ===
  last_active_at              TIMESTAMPTZ DEFAULT NOW(),
  resume_reason               TEXT CHECK (resume_reason IN ('network_error', 'intentional_pause')),

  -- === Financial Data (dari chat — diupdate real-time oleh extractor) ===
  monthly_revenue             BIGINT,                       -- F1, F2 scoring
  monthly_expense             BIGINT,                       -- F1 scoring
  transaction_frequency_daily INTEGER,                      -- F2 scoring
  assets_estimate             BIGINT,                       -- C1 scoring
  main_revenue_source         TEXT,
  has_multiple_months         BOOLEAN DEFAULT FALSE,        -- F2 consistency bonus
  revenue_declared_month      INTEGER CHECK (revenue_declared_month BETWEEN 1 AND 12),

  -- === Financial Snapshot (JSONB — full extracted data per turn, append) ===
  -- Diupdate setiap message oleh extractor pipeline
  -- Contoh: {"monthly_revenue": 20000000, "monthly_expense": 13500000, ...}
  financial_snapshot          JSONB,

  -- === GPS / Location ===
  gps_source                  TEXT CHECK (gps_source IN (
    'auto_device', 'manual_pin', 'text_only', 'none'
  )) DEFAULT 'none',
  gps_plausibility_score      FLOAT CHECK (gps_plausibility_score BETWEEN 0.0 AND 1.0) DEFAULT 0.0,

  -- === Document & Photo Analysis ===
  photo_condition_score       FLOAT CHECK (photo_condition_score BETWEEN 0.0 AND 100.0),
  -- ^ Dari AI image analysis foto usaha (C2 scoring)

  -- === Anti-abuse & Contradiction Tracking ===
  contradiction_count         INTEGER DEFAULT 0,            -- dual-write dari extractor
  session_attempt_count       INTEGER DEFAULT 0,
  off_topic_count             INTEGER DEFAULT 0,            -- behavioral tracking
  injection_attempt_count     INTEGER DEFAULT 0,            -- security tracking

  -- === Wellbeing & Special Flags ===
  emotional_signal            BOOLEAN DEFAULT FALSE,        -- user menunjukkan tanda distress
  wellbeing_concern           BOOLEAN DEFAULT FALSE,        -- level 3 distress — suspend scoring
  long_message_detected       BOOLEAN DEFAULT FALSE,        -- pesan >4000 char (flood token)

  -- === Timestamps ===
  expires_at                  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  completed_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id              ON sessions(user_id);
CREATE INDEX idx_sessions_business_id          ON sessions(business_id);
CREATE INDEX idx_sessions_status               ON sessions(status);
CREATE INDEX idx_sessions_interview_stage      ON sessions(interview_stage);
CREATE INDEX idx_sessions_contradiction_count  ON sessions(contradiction_count);
CREATE INDEX idx_sessions_revenue_month        ON sessions(revenue_declared_month);
CREATE INDEX idx_sessions_last_active          ON sessions(last_active_at);

-- ============================================================
-- SECTION 4: chat_history
-- ============================================================
CREATE TABLE chat_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  message_type    TEXT DEFAULT 'text' CHECK (message_type IN (
    'text', 'image', 'location', 'ui_component'
  )),

  -- Structured data extracted from this turn
  extracted_data  JSONB,
  -- Contoh extracted_data:
  -- {
  --   "monthly_revenue": 20000000,
  --   "owner_name": "Reza",
  --   "contradiction_detected": false,
  --   "plausibility_warning": false,
  --   "updated_fields": {"employee_count": {"old": 1, "new": 3}},
  --   "contradiction_log": {"field": "monthly_revenue", "old": 15000000, "new": 20000000, "delta_pct": 33.3}
  -- }

  ui_trigger      TEXT CHECK (ui_trigger IN (
    'map_picker', 'file_upload', 'summary_card',
    'login_gate', 'psikometrik_widget', NULL
  )),
  current_stage   TEXT,                                     -- stage saat message ini dikirim
  flags           JSONB,
  -- Contoh flags:
  -- {
  --   "contradiction_detected": false,
  --   "plausibility_warning": false,
  --   "hard_block_trigger": false,
  --   "data_flag": "sufficient",
  --   "off_topic": false,
  --   "injection_attempt": false,
  --   "emotional_signal": false
  -- }

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_session_id   ON chat_history(session_id);
CREATE INDEX idx_chat_created_at   ON chat_history(created_at);
CREATE INDEX idx_chat_role         ON chat_history(role);

-- ============================================================
-- SECTION 5: documents (+ forensics & OCR)
-- ============================================================
CREATE TABLE documents (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID REFERENCES sessions(id) ON DELETE CASCADE,
  doc_type              TEXT NOT NULL CHECK (doc_type IN (
    'nota', 'struk', 'ktp', 'buku_kas', 'rekening_koran',
    'foto_usaha', 'screenshot_marketplace', 'video_pitching', 'other'
  )),
  media_type            TEXT DEFAULT 'document' CHECK (media_type IN (
    'document', 'image', 'video'
  )),
  file_url              TEXT NOT NULL,                      -- Supabase Storage URL
  file_size             INTEGER,                            -- bytes
  file_name             TEXT,                               -- original filename

  -- === OCR Results (Azure AI Document Intelligence) ===
  ocr_status            TEXT DEFAULT 'pending' CHECK (ocr_status IN (
    'pending', 'processing', 'done', 'failed', 'skipped'
  )),
  ocr_result            JSONB,                              -- structured extraction result
  ocr_confidence        FLOAT CHECK (ocr_confidence BETWEEN 0.0 AND 1.0),
  ocr_raw_text          TEXT,                               -- raw OCR text output
  ocr_extracted_amount  BIGINT,                             -- amount extracted (untuk cross-check)
  ocr_extracted_date    DATE,                               -- tanggal dari dokumen
  ocr_merchant_name     TEXT,                               -- nama merchant/toko dari struk

  -- === Image Forensics (V3.1) ===
  image_phash           TEXT,                               -- perceptual hash untuk dedup
  exif_meta             JSONB,                              -- camera model, GPS, timestamp
  image_forgery_score   FLOAT CHECK (image_forgery_score BETWEEN 0.0 AND 1.0) DEFAULT 0.0,
  has_exif              BOOLEAN DEFAULT FALSE,
  exif_plausible        BOOLEAN DEFAULT TRUE,               -- exif GPS matches session location?
  duplicate_flag        BOOLEAN DEFAULT FALSE,              -- phash ditemukan di sesi lain

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_session_id   ON documents(session_id);
CREATE INDEX idx_documents_doc_type     ON documents(doc_type);
CREATE INDEX idx_documents_phash        ON documents(image_phash);
CREATE INDEX idx_documents_ocr_status   ON documents(ocr_status);
CREATE INDEX idx_documents_duplicate    ON documents(duplicate_flag);

-- ============================================================
-- SECTION 6: credit_assessments (V3.1 + V3.2 additions)
-- ============================================================
CREATE TABLE credit_assessments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- === Final Score ===
  final_score             INTEGER CHECK (final_score BETWEEN 300 AND 850),
  risk_level              TEXT CHECK (risk_level IN (
    'Very Low', 'Low', 'Medium', 'High', 'Very High'
  )),

  -- === Sub-scores (0–100 per pilar) ===
  score_financial         INTEGER CHECK (score_financial BETWEEN 0 AND 100),
  score_collateral        INTEGER CHECK (score_collateral BETWEEN 0 AND 100),
  score_experience        INTEGER CHECK (score_experience BETWEEN 0 AND 100),
  score_location          INTEGER CHECK (score_location BETWEEN 0 AND 100),
  score_character         INTEGER CHECK (score_character BETWEEN 0 AND 100),
  score_document          INTEGER CHECK (score_document BETWEEN 0 AND 100),
  -- ^ score_document dipertahankan untuk backward compat, V3.1 pakai multiplier

  -- === Sub-component Breakdown (JSONB per pilar) ===
  raw_scores              JSONB,
  -- Contoh raw_scores:
  -- {
  --   "financial": {"F1": 78, "F2": 65, "F3": null, "S_financial": 73},
  --   "collateral": {"C1": 55, "C2": 70, "S_collateral": 61},
  --   "experience": {"E1": 80, "E2": 45, "E3": 60, "S_experience": 65},
  --   "location": {"L1": 80, "L2": 75, "L3": 60, "S_location": 72},
  --   "character": {"CH1": 70, "CH2": 65, "CH3": 50, "S_character": 64}
  -- }

  -- === Bobot (V3.1: 0.40/0.25/0.15/0.10/0.10) ===
  weights                 JSONB DEFAULT '{
    "financial":0.40,
    "collateral":0.25,
    "experience":0.15,
    "location":0.10,
    "character":0.10
  }',

  -- === Confidence & Data Quality ===
  confidence_multipliers  JSONB,
  -- Contoh:
  -- {"financial":0.92,"collateral":0.85,"experience":0.90,"location":0.88,"character":0.80}

  gcs                     FLOAT CHECK (gcs BETWEEN 0.0 AND 1.0),    -- Global Confidence Score
  data_flag               TEXT CHECK (data_flag IN (
    'sufficient', 'limited', 'insufficient'
  )),

  -- === Fraud & Security ===
  fraud_flag              BOOLEAN DEFAULT FALSE,
  hard_block_triggered    BOOLEAN DEFAULT FALSE,
  hard_block_reason       TEXT,

  -- === Loan Recommendation ===
  loan_eligible           BOOLEAN DEFAULT FALSE,
  loan_max_amount         BIGINT,
  loan_tenor_months       INTEGER,
  loan_interest_range     TEXT,

  -- === AI-Generated Content ===
  explanation             TEXT,                                        -- narasi Gemini bahasa Indonesia
  sentiment_analysis      JSONB,                                       -- hasil sentiment analysis
  consistency_check       JSONB,                                       -- cross-field consistency result

  -- === Psikometrik (Advanced mode — CH3 scoring) ===
  psikometrik_results     JSONB,
  -- Contoh: {"score": 72.5, "responses": {...}, "completed_at": "..."}

  -- === Character Analysis (Untuk CH2 scoring) ===
  character_analysis_raw  JSONB,
  -- Contoh:
  -- {
  --   "contradiction_highlights": ["revenue 20jt → 15jt (25% drop)"],
  --   "sentiment_score": 0.4,
  --   "sentiment_confidence": "medium",
  --   "completeness_pct": 85,
  --   "cooperation_level": "high"
  -- }

  -- === Audit Trail ===
  raw_extracted_data      JSONB,                                       -- semua field yang diekstrak dari chat
  updated_fields_log      JSONB,
  -- Contoh:
  -- [
  --   {"field":"employee_count","old":1,"new":3,"revised_at":"...", "revision_type":"normal"},
  --   {"field":"monthly_revenue","old":20000000,"new":22000000,"revised_at":"...","revision_type":"summary_correction"}
  -- ]

  -- === Contradiction Snapshot (immutable — dual-write dari sessions) ===
  contradiction_count_snapshot INTEGER,
  -- ^ snapshot saat scoring triggered — tidak berubah setelah ini

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assessment_session_id   ON credit_assessments(session_id);
CREATE INDEX idx_assessment_final_score  ON credit_assessments(final_score);
CREATE INDEX idx_assessment_risk_level   ON credit_assessments(risk_level);
CREATE INDEX idx_assessment_fraud_flag   ON credit_assessments(fraud_flag);
CREATE INDEX idx_assessment_data_flag    ON credit_assessments(data_flag);

-- ============================================================
-- SECTION 7: geospatial_scores
-- ============================================================
CREATE TABLE geospatial_scores (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- === Computed Scores (0–100) ===
  location_score          INTEGER CHECK (location_score BETWEEN 0 AND 100),         -- L_total
  market_proximity_score  INTEGER CHECK (market_proximity_score BETWEEN 0 AND 100), -- L1
  business_density_score  INTEGER CHECK (business_density_score BETWEEN 0 AND 100), -- L2
  infrastructure_score    INTEGER CHECK (infrastructure_score BETWEEN 0 AND 100),   -- L3

  -- === Raw Geo Data ===
  market_nearest_name     TEXT,
  market_distance_km      FLOAT,
  business_count_500m     INTEGER,
  road_access             BOOLEAN,
  road_type               TEXT,          -- 'trunk','primary','secondary','residential','other'
  bank_nearby             BOOLEAN,

  -- === GPS Verification (M_location multiplier inputs) ===
  device_lat              FLOAT,
  device_lon              FLOAT,
  manual_lat              FLOAT,
  manual_lon              FLOAT,
  device_vs_pin_km        FLOAT,         -- jarak device GPS vs manual pin
  gps_plausibility_score  FLOAT CHECK (gps_plausibility_score BETWEEN 0.0 AND 1.0),

  raw_factors             JSONB,         -- full OSM Overpass API response
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geospatial_session_id ON geospatial_scores(session_id);

-- ============================================================
-- SECTION 8: fraud_signals (append-only)
-- ============================================================
CREATE TABLE fraud_signals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
  business_id  UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  signal_type  TEXT NOT NULL,
  -- Contoh signal_type:
  -- 'wash_trading_detected'
  -- 'duplicate_document'
  -- 'gps_mismatch_critical'
  -- 'multi_business_same_device'
  -- 'revenue_10x_above_median'
  -- 'injection_attempt'
  -- 'forgery_score_high'
  -- 'prev_loan_macet_large'
  -- 'contradiction_threshold_exceeded'
  severity     TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  details      JSONB,                                        -- bukti spesifik, evidence snippets
  resolved     BOOLEAN DEFAULT FALSE,                        -- sudah di-review admin
  resolved_by  UUID REFERENCES user_profiles(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_signals_session_id  ON fraud_signals(session_id);
CREATE INDEX idx_fraud_signals_business_id ON fraud_signals(business_id);
CREATE INDEX idx_fraud_signals_user_id     ON fraud_signals(user_id);
CREATE INDEX idx_fraud_signals_severity    ON fraud_signals(severity);
CREATE INDEX idx_fraud_signals_resolved    ON fraud_signals(resolved);
CREATE INDEX idx_fraud_signals_created_at  ON fraud_signals(created_at);

-- Fraud signals tidak bisa diakses public
REVOKE ALL ON fraud_signals FROM PUBLIC;

-- ============================================================
-- SECTION 9: multiplier_audit (V3.1, append-only)
-- ============================================================
CREATE TABLE multiplier_audit (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id  UUID REFERENCES credit_assessments(id) ON DELETE CASCADE,
  multipliers    JSONB NOT NULL,
  reason         TEXT,
  triggered_by   TEXT,   -- 'scoring_pipeline' | 'manual_override' | 'fraud_detection'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_multiplier_audit_assessment_id ON multiplier_audit(assessment_id);

REVOKE ALL ON multiplier_audit FROM PUBLIC;

-- ============================================================
-- SECTION 10: device_fingerprints (anti-abuse)
-- ============================================================
CREATE TABLE device_fingerprints (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,                             -- fingerprint hash
  user_agent      TEXT,
  ip_address      TEXT,
  ip_geo_country  TEXT,
  ip_geo_city     TEXT,
  business_count  INTEGER DEFAULT 1,                         -- berapa bisnis dari device ini
  suspicious      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_fingerprints_device_id   ON device_fingerprints(device_id);
CREATE INDEX idx_device_fingerprints_user_id     ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_suspicious  ON device_fingerprints(suspicious);

REVOKE ALL ON device_fingerprints FROM PUBLIC;

-- ============================================================
-- SECTION 11: RLS Policies
-- Chain: user_profiles → business_profiles → sessions → child tables
-- Backend pakai service_role (bypass RLS) — ini untuk frontend
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: akses milik sendiri"
  ON user_profiles FOR ALL
  USING (auth.uid() = id);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_profiles: akses milik sendiri"
  ON business_profiles FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: akses milik sendiri"
  ON sessions FOR ALL
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_history: akses via session milik sendiri"
  ON chat_history FOR ALL
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents: akses via session milik sendiri"
  ON documents FOR ALL
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE credit_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_assessments: akses via session milik sendiri"
  ON credit_assessments FOR ALL
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

ALTER TABLE geospatial_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "geospatial_scores: akses via session milik sendiri"
  ON geospatial_scores FOR ALL
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- ============================================================
-- SECTION 12: Functions & Triggers
-- ============================================================

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_credit_assessments_updated_at
  BEFORE UPDATE ON credit_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update last_active_at saat sessions diupdate
CREATE OR REPLACE FUNCTION update_last_active_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_last_active_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_last_active_at();

-- ============================================================
-- Auto-create user_profile saat Google Sign In
-- WAJIB: trigger ini harus ada sebelum testing auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Helper: insert fraud signal (dipanggil oleh backend scoring)
-- ============================================================
CREATE OR REPLACE FUNCTION insert_fraud_signal(
  p_session_id  UUID,
  p_business_id UUID,
  p_user_id     UUID,
  p_type        TEXT,
  p_severity    TEXT,
  p_details     JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID := uuid_generate_v4();
BEGIN
  INSERT INTO fraud_signals(id, session_id, business_id, user_id, signal_type, severity, details)
  VALUES (v_id, p_session_id, p_business_id, p_user_id, p_type, p_severity, p_details);
  RETURN v_id;
END;
$$;

-- ============================================================
-- Helper: archive old fraud signals (dipanggil via Supabase CRON)
-- Rekomendasi: jalankan setiap bulan
-- Usage: SELECT archive_old_fraud_signals(now() - interval '180 days');
-- ============================================================
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

-- ============================================================
-- SECTION 13: Grants untuk service_role (backend)
-- ============================================================
GRANT ALL ON fraud_signals        TO service_role;
GRANT ALL ON multiplier_audit     TO service_role;
GRANT ALL ON device_fingerprints  TO service_role;
GRANT EXECUTE ON FUNCTION insert_fraud_signal(UUID,UUID,UUID,TEXT,TEXT,JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_fraud_signals(TIMESTAMPTZ) TO service_role;

-- ============================================================
-- SECTION 14: Views
-- ============================================================

-- Dashboard overview: skor terbaru per bisnis (untuk halaman list bisnis user)
CREATE OR REPLACE VIEW v_business_latest_score AS
  SELECT DISTINCT ON (s.business_id)
    bp.id              AS business_id,
    bp.business_name,
    bp.category,
    bp.user_id,
    ca.final_score,
    ca.risk_level,
    ca.data_flag,
    ca.fraud_flag,
    ca.loan_eligible,
    s.created_at       AS assessed_at
  FROM credit_assessments ca
  JOIN sessions s ON ca.session_id = s.id
  JOIN business_profiles bp ON s.business_id = bp.id
  ORDER BY s.business_id, s.created_at DESC;

-- Fraud signals yang masih aktif (belum expired dan belum resolved)
CREATE OR REPLACE VIEW v_recent_fraud_signals AS
  SELECT id, session_id, business_id, user_id,
    signal_type, severity, details, resolved, created_at
  FROM fraud_signals
  WHERE created_at >= now() - interval '90 days'
    AND resolved = FALSE
  ORDER BY created_at DESC;

-- Session progress untuk resume logic
CREATE OR REPLACE VIEW v_session_resume AS
  SELECT
    s.id AS session_id,
    s.user_id,
    s.business_id,
    bp.business_name,
    s.status,
    s.interview_stage,
    s.progress_pct,
    s.last_active_at,
    s.resume_reason,
    EXTRACT(EPOCH FROM (NOW() - s.last_active_at)) AS seconds_since_active,
    s.mode,
    s.contradiction_count,
    s.financial_snapshot
  FROM sessions s
  JOIN business_profiles bp ON s.business_id = bp.id
  WHERE s.status = 'active';

-- ============================================================
-- SECTION 15: Common Query Patterns
--
-- [A] Semua bisnis milik user:
--   SELECT * FROM business_profiles
--   WHERE user_id = auth.uid() AND is_active = TRUE
--   ORDER BY created_at DESC;
--
-- [B] History assessment per bisnis:
--   SELECT s.*, ca.final_score, ca.risk_level, ca.data_flag
--   FROM sessions s
--   LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   WHERE s.business_id = $1
--   ORDER BY s.created_at DESC;
--
-- [C] Dashboard overview (skor terbaru per bisnis):
--   SELECT * FROM v_business_latest_score
--   WHERE user_id = auth.uid();
--
-- [D] Detail lengkap satu sesi assessment:
--   SELECT
--     s.*, bp.business_name, bp.category, bp.location_address,
--     bp.has_wa_business, bp.marketplace_platform, bp.marketplace_rating,
--     bp.has_qris, bp.asset_type, bp.psychometric_score,
--     ca.final_score, ca.risk_level, ca.score_financial, ca.score_collateral,
--     ca.score_experience, ca.score_location, ca.score_character,
--     ca.raw_scores, ca.confidence_multipliers, ca.gcs, ca.data_flag,
--     ca.fraud_flag, ca.hard_block_triggered, ca.explanation,
--     ca.loan_eligible, ca.loan_max_amount, ca.loan_tenor_months,
--     ca.loan_interest_range, ca.character_analysis_raw,
--     ca.updated_fields_log,
--     gs.location_score, gs.market_nearest_name, gs.market_distance_km,
--     gs.business_density_score, gs.infrastructure_score
--   FROM sessions s
--   JOIN business_profiles bp ON s.business_id = bp.id
--   LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   LEFT JOIN geospatial_scores gs ON gs.session_id = s.id
--   WHERE s.id = $1;
--
-- [E] Cek session resume (apakah user punya active session?):
--   SELECT * FROM v_session_resume
--   WHERE user_id = auth.uid()
--   ORDER BY last_active_at DESC;
--
-- [F] Semua dokumen satu sesi beserta OCR status:
--   SELECT id, doc_type, file_url, ocr_status, ocr_confidence,
--     ocr_extracted_amount, ocr_extracted_date,
--     image_forgery_score, duplicate_flag
--   FROM documents
--   WHERE session_id = $1
--   ORDER BY created_at ASC;
--
-- ============================================================
-- END OF SCHEMA V3.2
-- ============================================================