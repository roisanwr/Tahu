Nah ini pertanyaan yang paling worth dijawab detail! Aku udah baca semua dokumen kamu. Yuk kita breakdown backend-nya secara komprehensif dan terstruktur.

---

## 🏗️ Struktur Direktori Backend (Final)

```
backend/
│
├── main.py                  ← FastAPI app entry point, CORS, router registry
├── requirements.txt         ← semua dependencies
├── .env                     ← semua secret keys
│
├── core/
│   ├── config.py            ← load env vars, settings class
│   ├── database.py          ← Supabase client connection
│   └── security.py          ← JWT verification middleware (Supabase token)
│
├── routers/                 ← satu file = satu domain endpoint
│   ├── sessions.py          ← POST /sessions, GET /sessions/:id
│   ├── chat.py              ← POST /chat
│   ├── documents.py         ← POST /upload-document
│   ├── geoscore.py          ← POST /geoscore
│   └── scoring.py           ← POST /calculate-score, GET /assessments/:id
│
├── services/                ← business logic, dipisah dari routing
│   ├── ai_agent.py          ← Gemini API wrapper + interview flow controller
│   ├── document_ocr.py      ← Azure Document Intelligence wrapper
│   ├── geospatial.py        ← OpenStreetMap + Overpass API logic
│   └── scoring_engine.py    ← heuristic scoring calculator
│
├── models/                  ← Pydantic request/response schemas
│   ├── session.py
│   ├── chat.py
│   ├── document.py
│   ├── geoscore.py
│   └── scoring.py
│
└── utils/
    ├── prompts.py           ← semua prompt templates (dari PROMPTS.md)
    └── helpers.py           ← currency parser, normalization utils
```

---

## 🔄 Alur Data End-to-End (Big Picture)

Ini alur paling penting yang harus kamu pahami dulu sebelum nulis satu baris kode pun:

```
USER (Frontend)
    │
    ▼
[1] POST /sessions          → buat sesi baru, simpan ke DB
    │
    ▼
[2] POST /chat (loop)       → user ngobrol, Gemini menjawab
    │  ├─ simpan ke chat_history
    │  ├─ ekstrak data incremental ke extracted_data JSONB
    │  └─ update interview_stage + progress_pct di sessions
    │
    ├── [3] POST /upload-document (opsional, dari dalam chat)
    │       ├─ upload file ke Supabase Storage
    │       ├─ kirim ke Azure OCR
    │       └─ simpan hasil ke documents table
    │
    ├── [4] POST /geoscore (opsional, dari dalam chat)
    │       ├─ query OpenStreetMap Nominatim (geocoding)
    │       ├─ query Overpass API (business density)
    │       └─ simpan ke geospatial_scores table
    │
    ▼
[5] POST /calculate-score   → dipanggil saat interview_stage = "summary"
    │  ├─ tarik semua chat_history
    │  ├─ kirim ke Gemini → dapat JSON terstruktur (data extraction)
    │  ├─ tarik geospatial_scores
    │  ├─ tarik documents (ambil ocr_confidence)
    │  ├─ hitung semua sub-skor (scoring_engine.py)
    │  ├─ normalisasi ke range 300-850
    │  ├─ generate AI explanation (Gemini)
    │  └─ simpan ke credit_assessments
    │
    ▼
[6] GET /assessments/:id    → frontend ambil hasil untuk dashboard
```

---

## 📦 Isi Per File (Detail Implementasi)

### `main.py` — Entry Point
Tugasnya simpel: setup CORS, daftarkan semua routers, dan health check.

```python
# Yang perlu ada di sini:
# - FastAPI() instance
# - CORSMiddleware (allow origins: localhost:3000 + domain Vercel kamu)
# - include_router() untuk semua routers
# - GET /health endpoint
```

---

### `core/security.py` — JWT Middleware ⚠️
Ini yang sering dilupakan dan jadi bottleneck. Setiap request dari frontend akan bawa **Supabase JWT token** di header `Authorization: Bearer <token>`. FastAPI harus **verifikasi** token ini sebelum proses apapun.

```python
# Logic:
# 1. Ambil token dari header
# 2. Decode JWT menggunakan SUPABASE_JWT_SECRET (dari env)
# 3. Ambil user_id dari payload
# 4. Inject sebagai dependency ke semua protected routes
```

---

### `services/ai_agent.py` — Otak Chatbot

Ini file paling kompleks. Isinya ada dua fungsi utama:

**Fungsi 1: `get_ai_response(session_id, user_message, current_stage)`**
```
1. Ambil last N pesan dari chat_history (N = 10, untuk context window)
2. Format ke format Gemini multi-turn conversation
3. Inject system prompt dari prompts.py (sesuai stage)
4. Call Gemini API
5. Parse response JSON dari Gemini
   → { message, current_stage, ui_trigger, extracted_fields }
6. Simpan ke chat_history (role: assistant)
7. Update interview_stage di sessions jika ada perubahan
8. Return ke router
```

**Fungsi 2: `extract_business_data(session_id)`**
```
1. Ambil SEMUA chat_history dari session
2. Kirim ke Gemini dengan Data Extraction Prompt
3. Dapat structured JSON bisnis
4. Upsert ke business_profiles table
5. Return JSON
```

---

### `services/document_ocr.py` — Azure Integration

```
1. Terima file bytes dari router
2. Upload ke Supabase Storage → dapat file_url
3. Insert ke documents table (status: 'processing')
4. Kirim file ke Azure AI Document Intelligence
5. Parse response:
   - total_amount, items, tanggal, merchant_name
   - confidence score (0.0–1.0)
6. Update documents table (status: 'done', ocr_result, ocr_confidence)
7. Return extracted data ke router
```

---

### `services/geospatial.py` — Location Scoring

```
1. Terima lat, lng dari router
2. Query Nominatim → geocoding/reverse geocoding
3. Query Overpass API:
   - amenity=marketplace radius 2km → market_proximity
   - shop=* radius 500m → business_density
   - highway=* → road_access
   - amenity=bank radius 1km → bank_nearby
4. Hitung sub-skor masing-masing (0–100)
5. Weighted average → location_score
6. Upsert ke geospatial_scores table
7. Return score + factors
```

---

### `services/scoring_engine.py` — Heuristic Calculator

Ini yang nge-aggregate semua skor. Sesuai `SCORING_RULES.md` kamu, ada 5 dimensi:

```python
# Input: business_profile + geospatial_score + documents + chat_history

def score_financial(business_profile) → int (0-100)
    # omzet, pengeluaran, profit ratio, transaction_frequency, assets

def score_experience(business_profile) → int (0-100)
    # years_operating, employee_count, has_prev_loan, prev_loan_status

def score_location(session_id) → int (0-100)
    # ambil dari geospatial_scores yang sudah ada

def score_document(session_id) → int (0-100)
    # rata-rata ocr_confidence dari semua dokumen yang di-upload

def score_character(chat_history) → int (0-100)
    # kirim chat ke Gemini → sentiment analysis
    # sentiment_score, completeness_pct, cooperation_level

def normalize_to_fico(raw_score) → int (300-850)
    # linear mapping dari (0-100) ke (300-850)

def calculate_final(session_id) → dict
    # panggil semua sub-fungsi
    # weighted average dengan bobot default
    # 35% fin + 20% exp + 15% loc + 15% doc + 15% char
    # simpan ke credit_assessments
```

---

## 🔌 Semua Endpoint & Kontraknya

| Method | Path | Dipanggil Kapan | Auth |
|---|---|---|---|
| `GET` | `/health` | Cron-job.org keep-alive | ❌ |
| `POST` | `/sessions` | User mulai wawancara | ✅ JWT |
| `GET` | `/sessions/{id}` | Frontend cek progress | ✅ JWT |
| `POST` | `/chat` | Setiap pesan user | ✅ JWT |
| `POST` | `/upload-document` | User upload foto nota | ✅ JWT |
| `POST` | `/geoscore` | User pin lokasi di map | ✅ JWT |
| `POST` | `/calculate-score` | Interview stage = summary | ✅ JWT |
| `GET` | `/assessments/{id}` | Dashboard load skor | ✅ JWT |

---

## ⚙️ Environment Variables yang Dibutuhkan

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx       ← untuk backend bypass RLS
SUPABASE_JWT_SECRET=xxxx             ← untuk verify JWT

# Gemini
GEMINI_API_KEY=xxxx
GEMINI_MODEL=gemini-2.0-flash        ← paling hemat di 2026

# Azure
AZURE_DOCUMENT_ENDPOINT=https://xxxx.cognitiveservices.azure.com/
AZURE_DOCUMENT_KEY=xxxx

# App
FRONTEND_URL=https://your-app.vercel.app
ENVIRONMENT=development              ← toggle debug mode
```

---

## 📋 Urutan Implementasi yang Disarankan

Kalau mau mulai dari nol hari ini, urutannya ini:

1. **Day 1** — Setup boilerplate: `main.py`, `core/config.py`, `core/database.py`, health check. Tes koneksi ke Supabase.
2. **Day 2** — `routers/sessions.py` + `core/security.py`. JWT auth harus jalan dulu sebelum semua fitur lain.
3. **Day 3** — `services/ai_agent.py` + `routers/chat.py`. Ini backbone-nya.
4. **Day 4** — `services/document_ocr.py` + `routers/documents.py`.
5. **Day 5** — `services/geospatial.py` + `routers/geoscore.py`.
6. **Day 6** — `services/scoring_engine.py` + `routers/scoring.py`. Ini harusnya bisa jalan karena kamu bilang scoring lagi dikerjain.

---

## 💡 Satu Hal Penting yang Sering Kelewat

**Gunakan `SUPABASE_SERVICE_ROLE_KEY` di backend**, bukan `ANON_KEY`. Backend kamu perlu bypass RLS untuk bisa baca/tulis data apapun — RLS hanya untuk akses langsung dari frontend. Kalau pakai `ANON_KEY` di backend, semua query database-mu akan kena block RLS dan return empty. 😅

---

Dari semua ini, bagian mana yang mau kita mulai duluan? Atau mau aku bantu langsung draft `main.py` + `core/` sebagai pondasi pertama? 🚀