-- ============================================================
-- DB SCHEMA V2 — UMKM Credit Scoring Platform
-- Supabase PostgreSQL 15+
-- Updated: April 2026
-- Changelog dari V1:
--   [+] Kolom eksplisit untuk field scoring kritis (transaction_frequency,
--       loan_history, assets_estimate)
--   [+] NIK ditambahkan ke user_profiles
--   [+] doc_type enum diperluas (rekening_koran, foto_usaha,
--       screenshot_marketplace, video_pitching)
--   [+] media_type kolom baru di tabel documents
--   [~] JSONB additional_data di business_profiles didokumentasikan shape-nya
--   [~] JSONB sentiment_analysis di credit_assessments didokumentasikan shape-nya
--   [-] latitude & longitude dihapus dari geospatial_scores
--       → koordinat GPS kini single source of truth di business_profiles.location_point
--   [x] video_pitching: disimpan sebagai URL saja via doc_type, AI analysis di-skip MVP
--   [?] ADVANCE (belum diimplementasi, pikirin lagi):
--       indeks_ekonomi_daerah, gamifikasi_keputusan_finansial, konten_produk_count
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- SECTION 1: user_profiles
-- Extends auth.users dari Supabase Auth.
-- [+] Tambahan kolom: nik (wajib untuk identifikasi unik warga Indonesia)
--     NIK bersifat sensitif — pastikan hanya bisa dibaca oleh pemilik
--     akun dan admin via RLS policy.
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
-- SECTION 2: sessions
-- Satu sesi = satu proses wawancara/interview end-to-end.
-- mode 'basic' vs 'advanced' menentukan flow pertanyaan AI dan
-- fitur apa saja yang aktif (OCR, psikometrik, dll).
-- [!] expires_at ditambahkan agar backend bisa otomatis set
--     status = 'expired' via cron job / Supabase Edge Function.
-- ============================================================
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  mode            TEXT DEFAULT 'basic' CHECK (mode IN ('basic', 'advanced')),
  interview_stage TEXT DEFAULT 'intro' CHECK (
    interview_stage IN ('intro', 'profil', 'keuangan', 'dokumen', 'geolokasi', 'summary')
  ),
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- sesi kedaluwarsa dalam 7 hari
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status  ON sessions(status);

-- ============================================================
-- SECTION 3: chat_history
-- Menyimpan seluruh riwayat percakapan per sesi.
-- extracted_data JSONB menampung data bisnis yang berhasil
-- diekstrak AI dari setiap giliran percakapan — bersifat
-- incremental, bukan final. Final aggregated data ada di
-- business_profiles & credit_assessments.
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
-- SECTION 4: documents
-- Satu tabel untuk semua jenis dokumen (polymorphic storage).
-- Tidak ada tabel terpisah per tipe dokumen — gunakan doc_type
-- untuk membedakan jenis, dan media_type untuk membedakan format.
--
-- doc_type values:
--   'nota'                   → foto/scan nota transaksi
--   'struk'                  → struk kasir / print transaksi
--   'ktp'                    → foto KTP pemilik usaha
--   'buku_kas'               → foto buku kas manual
--   'rekening_koran'         → screenshot / scan rekening koran bank
--   'foto_usaha'             → foto tempat usaha (tampak depan, dalam, dll)
--   'screenshot_marketplace' → screenshot dashboard Tokopedia/Shopee/dll
--   'video_pitching'         → [MVP: simpan URL saja, AI analysis di-skip]
--                              [ADVANCE: tambah transcript & ai_video_analysis nanti]
--   'other'                  → dokumen lain yang belum dikategorikan
--
-- media_type values:
--   'document' → PDF, scan, foto dokumen (default)
--   'image'    → foto produk, foto usaha
--   'video'    → video pitching (URL ke Supabase Storage)
--
-- ocr_confidence: nilai 0.0–1.0 dari Azure AI Document Intelligence.
--   Digunakan langsung sebagai input S_document di scoring engine.
--   Hanya relevan untuk doc_type: nota, struk, buku_kas, rekening_koran.
--   Untuk foto_usaha, video_pitching → ocr_confidence = NULL.
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
-- SECTION 5: business_profiles
-- Data bisnis yang diekstrak/dikumpulkan selama sesi wawancara.
-- UNIQUE(session_id) → satu sesi = satu profil bisnis.
--
-- KOLOM EKSPLISIT (field yang langsung masuk scoring formula):
--   transaction_frequency_daily → input S_financial (volume transaksi)
--   has_prev_loan, prev_loan_amount, prev_loan_status → input S_experience
--   assets_estimate → input S_financial (aset sebagai collateral proxy)
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
-- [ADVANCE — belum diimplementasi, pikirin lagi]:
--   indeks_ekonomi_daerah   → butuh data eksternal BPS, belum ada API gratis
--   konten_produk_count     → bisa masuk ke social_media JSONB nanti
--   gamifikasi_keputusan    → butuh UI khusus, belum ada di plan MVP
--
-- KOORDINAT GPS:
--   location_point GEOGRAPHY adalah SINGLE SOURCE OF TRUTH untuk koordinat.
--   Tabel geospatial_scores TIDAK menyimpan lat/lng duplikat — ambil via JOIN.
-- ============================================================
CREATE TABLE business_profiles (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id                UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,

  -- Identitas Usaha
  business_name             TEXT,
  owner_name                TEXT,
  category                  TEXT,                           -- kategori usaha (kuliner, jasa, retail, dll)

  -- Pengalaman & Skala
  years_operating           FLOAT,                          -- lama usaha dalam tahun (bisa desimal, misal 1.5)
  employee_count            INTEGER,
  has_fixed_location        BOOLEAN DEFAULT FALSE,

  -- Keuangan Inti (input langsung S_financial)
  monthly_revenue           BIGINT,                         -- estimasi omzet per bulan (IDR)
  monthly_expense           BIGINT,                         -- estimasi pengeluaran per bulan (IDR)
  transaction_frequency_daily INTEGER,                      -- [+V2] rata-rata transaksi per hari
  assets_estimate           BIGINT,                         -- [+V2] estimasi total aset yang dimiliki (IDR)
  main_revenue_source       TEXT,                           -- deskripsi sumber penghasilan utama

  -- Riwayat Pinjaman (input S_experience & trust)
  has_prev_loan             BOOLEAN DEFAULT FALSE,          -- [+V2] pernah pinjam sebelumnya?
  prev_loan_amount          BIGINT,                         -- [+V2] jumlah pinjaman sebelumnya (IDR), NULL jika tidak ada
  prev_loan_status          TEXT CHECK (                    -- [+V2] status pinjaman sebelumnya
                              prev_loan_status IN ('lunas', 'cicilan_lancar', 'macet', 'belum_ada')
                            ),

  -- Lokasi (SINGLE SOURCE OF TRUTH untuk koordinat GPS)
  location_address          TEXT,
  location_point            GEOGRAPHY(POINT, 4326),         -- koordinat GPS (WGS84), diindex GiST

  -- Data Opsional & Digital Presence (JSONB)
  additional_data           JSONB,                          -- lihat shape di comment atas

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_session_id     ON business_profiles(session_id);
CREATE INDEX idx_business_location_point ON business_profiles USING GIST(location_point);

-- ============================================================
-- SECTION 6: credit_assessments
-- Hasil akhir dari scoring engine setelah wawancara selesai.
-- UNIQUE(session_id) → satu sesi = satu hasil assessment.
--
-- SUB-SCORES (masing-masing 0–100):
--   score_financial   → 35% bobot default (S_financial)
--   score_experience  → 20% bobot default (S_experience)
--   score_location    → 15% bobot default (S_location, diambil dari geospatial_scores)
--   score_document    → 15% bobot default (S_document, dari ocr_confidence dokumen)
--   score_character   → 15% bobot default (S_character, dari sentiment analysis chat)
--
-- final_score range 300–850 (FICO-style):
--   300–499 → Very High Risk
--   500–579 → High Risk
--   580–669 → Medium Risk
--   670–739 → Low Risk
--   740–850 → Very Low Risk
--
-- weights JSONB: bobot per dimensi, bisa di-override per lender nanti.
--   Default: {"financial":0.35,"experience":0.20,"location":0.15,
--             "document":0.15,"character":0.15}
--
-- KOLOM JSONB — sentiment_analysis (hasil AI dari chat + psikometrik):
--   Shape yang diharapkan:
--   {
--     "overall_sentiment": "positive" | "neutral" | "negative",
--     "confidence_level": "high" | "medium" | "low",
--     "psychometric_score": 72,          -- 0–100, dari kuesioner opsional
--     "financial_literacy_score": 65,    -- 0–100, dari kuis literasi opsional
--     "behavioral_signals": {
--       "response_consistency": 0.85,    -- float 0.0–1.0
--       "hesitation_pattern": "low" | "medium" | "high",
--       "answer_confidence": "high" | "medium" | "low"
--     },
--     "key_observations": ["...", "..."] -- array string, insight AI
--   }
--
-- KOLOM JSONB — consistency_check (hasil cross-check chat vs OCR dokumen):
--   Shape yang diharapkan:
--   {
--     "overall_consistency": "consistent" | "minor_discrepancy" | "major_discrepancy",
--     "score_penalty": 0,               -- integer, pengurangan poin karena inkonsistensi
--     "flags": [
--       { "field": "monthly_revenue", "chat_value": 10000000, "doc_value": 7500000, "delta_pct": 25 }
--     ]
--   }
--
-- [+V2] Tambahan kolom: updated_at + trigger untuk audit kapan skor terakhir dihitung ulang.
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

  -- Bobot (bisa di-override per lender di fase berikutnya)
  weights              JSONB DEFAULT '{"financial":0.35,"experience":0.20,"location":0.15,"document":0.15,"character":0.15}',

  -- Penjelasan naratif (dihasilkan oleh Gemini, bahasa Indonesia sederhana)
  explanation          TEXT,

  -- Rekomendasi Pinjaman
  loan_eligible        BOOLEAN DEFAULT FALSE,
  loan_max_amount      BIGINT,                                -- dalam IDR
  loan_tenor_months    INTEGER,
  loan_interest_range  TEXT,                                  -- contoh: "14-18%"

  -- Data AI Tambahan (JSONB — lihat shape di comment atas)
  raw_extracted_data   JSONB,    -- snapshot seluruh data bisnis saat scoring dihitung
  sentiment_analysis   JSONB,    -- hasil analisis sentimen & psikometrik
  consistency_check    JSONB,    -- hasil cross-check chat vs dokumen OCR

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()             -- [+V2] untuk audit recalculation
);

-- ============================================================
-- SECTION 7: geospatial_scores
-- Hasil analisis lokasi berbasis data OpenStreetMap / Overpass API.
-- UNIQUE(session_id) → satu sesi = satu hasil geoscore.
--
-- [V2 CHANGE] latitude & longitude DIHAPUS dari tabel ini.
--   Koordinat GPS ada di business_profiles.location_point (SINGLE SOURCE OF TRUTH).
--   Untuk query koordinat dari geospatial_scores, gunakan JOIN:
--
--   SELECT bp.location_point, gs.*
--   FROM geospatial_scores gs
--   JOIN sessions s ON gs.session_id = s.id
--   JOIN business_profiles bp ON bp.session_id = s.id
--   WHERE gs.session_id = $1;
--
-- location_score (0–100) = weighted dari 3 sub-komponen:
--   market_proximity_score  → kedekatan ke pasar/pusat ekonomi
--   business_density_score  → jumlah usaha kompetitor/komplementer radius 500m
--   infrastructure_score    → akses jalan & ketersediaan fasilitas (bank, dll)
--
-- raw_factors JSONB: data mentah dari Overpass API / Nominatim sebelum dinormalisasi.
--   Shape yang diharapkan:
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
  market_nearest_name     TEXT,                   -- nama pasar/pusat bisnis terdekat
  market_distance_km      FLOAT,                  -- jarak ke pasar terdekat dalam km

  business_density_score  INTEGER CHECK (business_density_score BETWEEN 0 AND 100),
  business_count_500m     INTEGER,                -- jumlah bisnis dalam radius 500m (dari Overpass)

  infrastructure_score    INTEGER CHECK (infrastructure_score BETWEEN 0 AND 100),
  road_access             BOOLEAN,                -- TRUE jika ada akses jalan yang layak
  bank_nearby             BOOLEAN,                -- TRUE jika ada bank/ATM dalam radius 1km

  -- Data Mentah dari Overpass / Nominatim (lihat shape di comment atas)
  raw_factors             JSONB,

  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geospatial_session_id ON geospatial_scores(session_id);

-- ============================================================
-- SECTION 8: RLS Policies
-- Row Level Security memastikan user hanya bisa akses data miliknya.
-- Semua tabel menggunakan auth.uid() dari Supabase JWT sebagai guard.
-- Tabel yang tidak punya user_id langsung → akses via subquery sessions.
--
-- CATATAN KEAMANAN:
--   Policy ini menggunakan FOR ALL (SELECT+INSERT+UPDATE+DELETE).
--   Untuk production, pertimbangkan pisah per operation:
--   - Admin boleh SELECT semua, tapi UMKM hanya boleh SELECT miliknya.
--   - UMKM tidak boleh DELETE credit_assessments mereka sendiri.
--   Untuk MVP ini, FOR ALL sudah cukup aman.
-- ============================================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles: akses milik sendiri" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: akses milik sendiri" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- chat_history
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_history: akses via session milik sendiri" ON chat_history
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents: akses via session milik sendiri" ON documents
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- business_profiles
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_profiles: akses via session milik sendiri" ON business_profiles
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- credit_assessments
ALTER TABLE credit_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_assessments: akses via session milik sendiri" ON credit_assessments
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- geospatial_scores
ALTER TABLE geospatial_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "geospatial_scores: akses via session milik sendiri" ON geospatial_scores
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- ============================================================
-- SECTION 9: Triggers & Functions
-- update_updated_at() dipasang di tabel yang punya kolom updated_at.
--
-- Tabel dengan trigger updated_at:
--   ✅ user_profiles
--   ✅ sessions
--   ✅ business_profiles
--   ✅ credit_assessments  ← [+V2] ditambahkan agar audit recalculation bisa dilacak
--
-- Tabel TANPA updated_at (append-only, tidak perlu update):
--   chat_history, documents, geospatial_scores
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: user_profiles
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: sessions
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: business_profiles
CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: credit_assessments [+V2]
CREATE TRIGGER trg_credit_assessments_updated_at
  BEFORE UPDATE ON credit_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- END OF SCHEMA V2
-- ============================================================
