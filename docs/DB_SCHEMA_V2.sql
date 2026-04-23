-- ============================================================
-- DB SCHEMA V3 — UMKM Credit Scoring Platform
-- Supabase PostgreSQL 15+
-- Updated: April 2026
--
-- Changelog dari V2 → V3:
--   [BREAKING] Arsitektur relasi diubah ke "Opsi B: Multi-Bisnis per User"
--
--   Sebelumnya (V2):
--     User → Sessions → BusinessProfile (1:1 via UNIQUE session_id)
--
--   Sekarang (V3):
--     User → [many] BusinessProfiles → [many] Sessions → Assessment
--
--   Detail perubahan:
--   [+] Tabel baru: `business_profiles` sekarang berdiri sendiri
--       dengan FK ke user_profiles (bukan ke sessions)
--   [+] sessions sekarang punya FK ke business_profiles (business_id)
--   [~] business_profiles.session_id (UNIQUE FK) DIHAPUS
--   [~] RLS policies di-update untuk chain baru
--       user → business_profiles → sessions → ...
--   [~] Komentar JOIN contoh di geospatial_scores di-update
--   [+] Index baru: idx_sessions_business_id
--   [+] business_profiles mendapat index idx_business_user_id
--
--   Motivasi:
--   Satu user (pemilik) bisa memiliki lebih dari satu usaha.
--   Tiap usaha bisa di-assess berkali-kali (re-scoring periodik).
--   Struktur ini lebih realistis untuk UMKM Indonesia yang sering
--   menjalankan 2–3 usaha sekaligus.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- SECTION 1: user_profiles
-- Extends auth.users dari Supabase Auth.
-- Tidak ada perubahan dari V2.
-- ============================================================
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  nik         VARCHAR(16) UNIQUE,          -- Nomor Induk Kependudukan (16 digit)
  phone       TEXT,
  email       TEXT,
  role        TEXT DEFAULT 'umkm' CHECK (role IN ('umkm', 'admin', 'lender')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: business_profiles  [V3: DIPINDAH SEBELUM sessions]
--
-- [V3 BREAKING CHANGE]
-- Sebelumnya: business_profiles ref ke sessions (session_id UNIQUE FK)
-- Sekarang:   business_profiles ref ke user_profiles (user_id FK)
--             Dan sessions yang punya FK ke business_profiles.
--
-- Satu user bisa punya banyak business profiles.
-- Satu business profile bisa punya banyak sessions (re-scoring).
--
-- KOLOM INTI: identitas dan data bisnis yang relatif statis.
-- Data yang berubah tiap sesi (omzet, pengeluaran, dokumen) ada di sessions.
--
-- KOLOM JSONB — additional_data (field opsional/digital presence):
--   Shape yang diharapkan:
--   {
--     "marketplace": {
--       "platform": "tokopedia" | "shopee" | "bukalapak" | "other",
--       "url": "https://...",
--       "rating": 4.8,               -- float 1.0–5.0
--       "total_reviews": 234,        -- integer
--       "monthly_orders": 120        -- integer, estimasi
--     },
--     "digital_payments": {
--       "has_qris": true,            -- boolean
--       "has_ewallet": true,         -- boolean
--       "ewallet_platforms": ["gopay", "ovo", "dana", "shopepay"]
--     },
--     "social_media": {
--       "platform": "instagram" | "tiktok" | "facebook" | "other",
--       "followers": 5200,           -- integer
--       "avg_engagement_rate": 3.2,  -- float, dalam persen
--       "has_whatsapp_business": true
--     }
--   }
--
-- KOORDINAT GPS:
--   location_point GEOGRAPHY adalah SINGLE SOURCE OF TRUTH untuk koordinat.
--   Diasumsikan lokasi usaha relatif tetap → disimpan di business_profiles.
--   Jika UMKM pindah lokasi, buat business_profile baru ATAU update di sini.
-- ============================================================
CREATE TABLE business_profiles (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,  -- [V3: FK ke user, bukan ke sessions]

  -- Identitas Usaha
  business_name             TEXT NOT NULL,
  owner_name                TEXT,
  category                  TEXT,                           -- kuliner, jasa, retail, online, dll
  description               TEXT,                          -- [+V3] deskripsi singkat usaha

  -- Pengalaman & Skala (data relatif statis)
  years_operating           FLOAT,                         -- lama usaha dalam tahun (bisa desimal, misal 1.5)
  employee_count            INTEGER,
  has_fixed_location        BOOLEAN DEFAULT FALSE,

  -- Lokasi (SINGLE SOURCE OF TRUTH untuk koordinat GPS)
  location_address          TEXT,
  location_point            GEOGRAPHY(POINT, 4326),        -- koordinat GPS (WGS84), diindex GiST

  -- Riwayat Pinjaman (relatif statis, update berkala)
  has_prev_loan             BOOLEAN DEFAULT FALSE,
  prev_loan_amount          BIGINT,                        -- jumlah pinjaman sebelumnya (IDR)
  prev_loan_status          TEXT CHECK (
                              prev_loan_status IN ('lunas', 'cicilan_lancar', 'macet', 'belum_ada')
                            ),

  -- Data Opsional & Digital Presence (JSONB)
  additional_data           JSONB,                         -- lihat shape di comment atas

  is_active                 BOOLEAN DEFAULT TRUE,          -- [+V3] soft delete / arsip profil

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_user_id       ON business_profiles(user_id);           -- [+V3]
CREATE INDEX idx_business_location_point ON business_profiles USING GIST(location_point);
CREATE INDEX idx_business_is_active     ON business_profiles(is_active);          -- [+V3]

-- ============================================================
-- SECTION 3: sessions
-- Satu sesi = satu proses wawancara/interview end-to-end untuk
-- satu business_profile tertentu.
--
-- [V3 BREAKING CHANGE]
-- Ditambahkan: business_id FK ke business_profiles.
-- Artinya: satu sesi selalu dikaitkan ke satu profil bisnis,
-- dan satu profil bisnis bisa punya banyak sesi (history penilaian).
--
-- Kolom keuangan sesi (berubah tiap assessment):
--   monthly_revenue, monthly_expense, transaction_frequency_daily,
--   assets_estimate, main_revenue_source
-- Ini dipindah dari business_profiles ke sessions karena nilainya
-- bisa berbeda tiap kali UMKM di-assess ulang.
--
-- mode 'basic' vs 'advanced' menentukan flow pertanyaan AI.
-- ============================================================
CREATE TABLE sessions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  business_id               UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,  -- [+V3]

  status                    TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  mode                      TEXT DEFAULT 'basic' CHECK (mode IN ('basic', 'advanced')),
  interview_stage           TEXT DEFAULT 'intro' CHECK (
    interview_stage IN ('intro', 'profil', 'keuangan', 'dokumen', 'geolokasi', 'summary')
  ),
  progress_pct              INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

  -- Snapshot Keuangan saat sesi ini (bisa berbeda tiap re-assessment)
  monthly_revenue           BIGINT,                        -- [V3: pindah dari business_profiles]
  monthly_expense           BIGINT,                        -- [V3: pindah dari business_profiles]
  transaction_frequency_daily INTEGER,                     -- [V3: pindah dari business_profiles]
  assets_estimate           BIGINT,                        -- [V3: pindah dari business_profiles]
  main_revenue_source       TEXT,                          -- [V3: pindah dari business_profiles]

  expires_at                TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id     ON sessions(user_id);
CREATE INDEX idx_sessions_business_id ON sessions(business_id);   -- [+V3]
CREATE INDEX idx_sessions_status      ON sessions(status);

-- ============================================================
-- SECTION 4: chat_history
-- Tidak ada perubahan dari V2.
-- Menyimpan seluruh riwayat percakapan per sesi.
-- extracted_data JSONB: data bisnis yang diekstrak AI per giliran.
-- ============================================================
CREATE TABLE chat_history (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content        TEXT NOT NULL,
  message_type   TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'ui_component')),
  extracted_data JSONB,   -- data bisnis yang diekstrak dari pesan ini (incremental)
  ui_trigger     TEXT,    -- nama komponen UI generatif yang di-trigger (jika ada)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_session_id  ON chat_history(session_id);
CREATE INDEX idx_chat_created_at  ON chat_history(created_at);

-- ============================================================
-- SECTION 5: documents
-- Tidak ada perubahan dari V2 kecuali: dokumen sekarang bisa
-- di-query via sessions → business_profiles → user_profiles.
--
-- doc_type values:
--   'nota'                   → foto/scan nota transaksi
--   'struk'                  → struk kasir / print transaksi
--   'ktp'                    → foto KTP pemilik usaha
--   'buku_kas'               → foto buku kas manual
--   'rekening_koran'         → screenshot / scan rekening koran bank
--   'foto_usaha'             → foto tempat usaha
--   'screenshot_marketplace' → screenshot dashboard marketplace
--   'video_pitching'         → [MVP: simpan URL saja]
--   'other'                  → dokumen lain
-- ============================================================
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID REFERENCES sessions(id) ON DELETE CASCADE,
  doc_type       TEXT NOT NULL CHECK (doc_type IN (
                   'nota',
                   'struk',
                   'ktp',
                   'buku_kas',
                   'rekening_koran',
                   'foto_usaha',
                   'screenshot_marketplace',
                   'video_pitching',
                   'other'
                 )),
  media_type     TEXT DEFAULT 'document' CHECK (media_type IN ('document', 'image', 'video')),
  file_url       TEXT NOT NULL,            -- URL ke Supabase Storage
  file_size      INTEGER,                  -- dalam bytes
  ocr_status     TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
  ocr_result     JSONB,                    -- hasil parsing terstruktur dari Azure AI
  ocr_confidence FLOAT CHECK (ocr_confidence BETWEEN 0.0 AND 1.0),
  ocr_raw_text   TEXT,                     -- raw text output Azure AI sebelum di-parse
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_doc_type   ON documents(doc_type);

-- ============================================================
-- SECTION 6: credit_assessments
-- Hasil akhir dari scoring engine setelah wawancara selesai.
-- UNIQUE(session_id) → satu sesi = satu hasil assessment.
--
-- [V3] Tidak ada perubahan struktural. Karena sudah ada UNIQUE
-- session_id, dan sessions sekarang terhubung ke business_profiles,
-- query history assessment per bisnis cukup via JOIN:
--
--   SELECT ca.*, s.created_at AS assessed_at
--   FROM credit_assessments ca
--   JOIN sessions s ON ca.session_id = s.id
--   WHERE s.business_id = $1
--   ORDER BY s.created_at DESC;
--
-- SUB-SCORES (masing-masing 0–100):
--   score_financial   → 35% bobot default
--   score_experience  → 20% bobot default
--   score_location    → 15% bobot default
--   score_document    → 15% bobot default
--   score_character   → 15% bobot default
--
-- final_score range 300–850 (FICO-style):
--   300–449 → Very High Risk
--   450–549 → High Risk
--   550–649 → Medium Risk
--   650–749 → Low Risk
--   750–850 → Very Low Risk
--
-- KOLOM JSONB — sentiment_analysis:
--   {
--     "overall_sentiment": "positive" | "neutral" | "negative",
--     "confidence_level": "high" | "medium" | "low",
--     "psychometric_score": 72,          -- 0–100
--     "financial_literacy_score": 65,    -- 0–100
--     "behavioral_signals": {
--       "response_consistency": 0.85,
--       "hesitation_pattern": "low" | "medium" | "high",
--       "answer_confidence": "high" | "medium" | "low"
--     },
--     "key_observations": ["...", "..."]
--   }
--
-- KOLOM JSONB — consistency_check:
--   {
--     "overall_consistency": "consistent" | "minor_discrepancy" | "major_discrepancy",
--     "score_penalty": 0,
--     "flags": [
--       { "field": "monthly_revenue", "chat_value": 10000000, "doc_value": 7500000, "delta_pct": 25 }
--     ]
--   }
-- ============================================================
CREATE TABLE credit_assessments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id           UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- Final Score
  final_score          INTEGER CHECK (final_score BETWEEN 300 AND 850),
  risk_level           TEXT CHECK (risk_level IN ('Very Low', 'Low', 'Medium', 'High', 'Very High')),

  -- Sub-scores per dimensi (0–100)
  score_financial      INTEGER CHECK (score_financial BETWEEN 0 AND 100),
  score_experience     INTEGER CHECK (score_experience BETWEEN 0 AND 100),
  score_location       INTEGER CHECK (score_location BETWEEN 0 AND 100),
  score_document       INTEGER CHECK (score_document BETWEEN 0 AND 100),
  score_character      INTEGER CHECK (score_character BETWEEN 0 AND 100),

  -- Bobot (bisa di-override per lender)
  weights              JSONB DEFAULT '{"financial":0.35,"experience":0.20,"location":0.15,"document":0.15,"character":0.15}',

  -- Penjelasan naratif (dihasilkan oleh Gemini)
  explanation          TEXT,

  -- Rekomendasi Pinjaman
  loan_eligible        BOOLEAN DEFAULT FALSE,
  loan_max_amount      BIGINT,
  loan_tenor_months    INTEGER,
  loan_interest_range  TEXT,                                  -- contoh: "14-18%"

  -- Data AI Tambahan (JSONB)
  raw_extracted_data   JSONB,
  sentiment_analysis   JSONB,
  consistency_check    JSONB,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: geospatial_scores
-- Tidak ada perubahan dari V2.
-- UNIQUE(session_id) → satu sesi = satu hasil geoscore.
--
-- [V3] Untuk query koordinat, JOIN via sessions → business_profiles:
--
--   SELECT bp.location_point, gs.*
--   FROM geospatial_scores gs
--   JOIN sessions s ON gs.session_id = s.id
--   JOIN business_profiles bp ON s.business_id = bp.id  -- [V3: relasi berubah]
--   WHERE gs.session_id = $1;
--
-- location_score (0–100) = weighted dari 3 sub-komponen.
-- raw_factors JSONB: data mentah dari Overpass API / Nominatim.
--   {
--     "nearest_market_name": "Pasar Anyar",
--     "nearest_market_distance_km": 0.8,
--     "business_count_500m": 47,
--     "road_type": "residential" | "secondary" | "primary" | "trunk",
--     "bank_count_1km": 3,
--     "atm_count_500m": 5,
--     "overpass_query_timestamp": "2026-04-20T10:30:00Z"
--   }
-- ============================================================
CREATE TABLE geospatial_scores (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- Skor Lokasi Keseluruhan
  location_score          INTEGER CHECK (location_score BETWEEN 0 AND 100),

  -- Sub-komponen Lokasi
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
-- SECTION 8: RLS Policies
-- [V3] Chain akses berubah:
--   business_profiles: via user_id langsung (lebih simpel)
--   sessions, chat_history, documents, credit_assessments,
--   geospatial_scores: via sessions.business_id → business_profiles.user_id
-- ============================================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: akses milik sendiri" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- business_profiles [V3: langsung cek user_id]
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_profiles: akses milik sendiri" ON business_profiles
  FOR ALL USING (auth.uid() = user_id);

-- sessions [V3: cek via business_profiles.user_id]
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: akses milik sendiri" ON sessions
  FOR ALL USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- chat_history
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_history: akses via session milik sendiri" ON chat_history
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents: akses via session milik sendiri" ON documents
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- credit_assessments
ALTER TABLE credit_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_assessments: akses via session milik sendiri" ON credit_assessments
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN business_profiles bp ON s.business_id = bp.id
      WHERE bp.user_id = auth.uid()
    )
  );

-- geospatial_scores
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
-- SECTION 9: Triggers & Functions
-- Tidak ada perubahan dari V2.
-- update_updated_at() dipasang di tabel yang punya kolom updated_at.
--
-- Tabel dengan trigger updated_at:
--   ✅ user_profiles
--   ✅ business_profiles
--   ✅ sessions
--   ✅ credit_assessments
--
-- Tabel TANPA updated_at (append-only):
--   chat_history, documents, geospatial_scores
-- ============================================================

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

-- ============================================================
-- SECTION 10: Query Patterns yang Sering Dipakai (V3)
--
-- [A] Semua bisnis milik seorang user:
--   SELECT * FROM business_profiles
--   WHERE user_id = $1 AND is_active = TRUE
--   ORDER BY created_at DESC;
--
-- [B] Semua sesi (history assessment) untuk satu bisnis:
--   SELECT s.*, ca.final_score, ca.risk_level
--   FROM sessions s
--   LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   WHERE s.business_id = $1
--   ORDER BY s.created_at DESC;
--
-- [C] Skor terbaru per bisnis (untuk dashboard overview):
--   SELECT DISTINCT ON (s.business_id)
--     bp.business_name, ca.final_score, ca.risk_level, s.created_at
--   FROM credit_assessments ca
--   JOIN sessions s ON ca.session_id = s.id
--   JOIN business_profiles bp ON s.business_id = bp.id
--   WHERE bp.user_id = $1
--   ORDER BY s.business_id, s.created_at DESC;
--
-- [D] Detail lengkap satu sesi (untuk halaman /dashboard/[session_id]):
--   SELECT
--     s.*, bp.business_name, bp.category, bp.location_address,
--     ca.final_score, ca.risk_level, ca.score_financial,
--     ca.score_experience, ca.score_location, ca.score_document,
--     ca.score_character, ca.explanation, ca.loan_eligible,
--     ca.loan_max_amount, ca.loan_tenor_months, ca.loan_interest_range,
--     gs.location_score, gs.market_nearest_name, gs.market_distance_km
--   FROM sessions s
--   JOIN business_profiles bp ON s.business_id = bp.id
--   LEFT JOIN credit_assessments ca ON ca.session_id = s.id
--   LEFT JOIN geospatial_scores gs ON gs.session_id = s.id
--   WHERE s.id = $1 AND bp.user_id = auth.uid();
--
-- ============================================================
-- END OF SCHEMA V3
-- ============================================================
