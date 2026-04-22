# 🚀 MASTER PLAN — UMKM Credit Scoring Platform (10-Day Prototype Sprint)

> **Misi:** Membangun prototipe fungsional platform credit scoring UMKM berbasis AI conversational interview dalam 10 hari kerja.
> **Tech Stack:** Next.js (Vercel) + FastAPI (Render) + Supabase (PostgreSQL) + Gemini API + Azure AI Document Intelligence

---

## 📋 Ringkasan Deliverables

| # | File Pendukung | Deskripsi |
|---|---|---|
| 1 | `DB_SCHEMA.sql` | SQL lengkap untuk Supabase (users, sessions, chat, assessments, geospatial) |
| 2 | `API_SPEC.md` | Kontrak API FastAPI — semua endpoint, request/response |
| 3 | `SCORING_RULES.md` | Formula heuristik v0 untuk semua dimensi skor |
| 4 | `PROMPTS.md` | Prompt engineering templates untuk Gemini & Azure |
| 5 | `DEPLOYMENT_CHECKLIST.md` | Step-by-step deployment ke Vercel + Render + Supabase |

---

## 🗓️ DAY 1 — Foundation & Infrastructure Setup

### Objectives
- Inisialisasi repo monorepo (`frontend/` + `backend/`)
- Setup Supabase project + jalankan `DB_SCHEMA.sql`
- Setup FastAPI boilerplate dengan CORS
- Setup Next.js + Tailwind + Supabase client

### Tasks
1. **Repo Init** — Buat repo GitHub, struktur direktori sesuai `plan2.md`
2. **Supabase Setup** — Create project, jalankan migration SQL dari `DB_SCHEMA.sql`
3. **Backend Boilerplate** — `main.py` FastAPI + CORS + health check endpoint
4. **Frontend Boilerplate** — Next.js app router + Tailwind + Supabase auth client
5. **Environment Config** — `.env` files untuk semua API keys (Gemini, Azure, Supabase)

### Output Day 1
- ✅ Repo dengan struktur clean
- ✅ Database live di Supabase dengan semua tabel
- ✅ Backend running di localhost:8000
- ✅ Frontend running di localhost:3000

---

## 🗓️ DAY 2 — Chat Interface (Frontend) + Session Management

### Objectives
- Build chat UI components
- Implement session lifecycle (create → active → completed)

### Tasks
1. **ChatBubble Component** — Komponen chat bubble untuk user & AI messages
2. **ChatInput Component** — Text input + send button + upload attachment trigger
3. **Session API** — `POST /sessions` untuk create session, `GET /sessions/:id` untuk status
4. **Supabase Realtime** — Subscribe ke `chat_history` untuk live message updates
5. **Chat Page (`page.tsx`)** — Wire semua komponen, scroll behavior, loading states

### Output Day 2
- ✅ Chat UI fungsional (send message, lihat history)
- ✅ Session tersimpan di database
- ✅ Chat history persisted ke Supabase

---

## 🗓️ DAY 3 — AI Chatbot Core (Gemini Integration)

### Objectives
- Integrate Gemini API sebagai "interviewer" AI
- Implement conversation flow logic (guided interview)

### Tasks
1. **`ai_agent.py`** — Gemini API wrapper dengan system prompt dari `PROMPTS.md`
2. **Interview Flow Controller** — State machine sederhana: `intro → profil → keuangan → dokumen → geolokasi → summary`
3. **`POST /chat`** — Endpoint terima message user, kirim ke Gemini + context, return AI response
4. **Context Window** — Kirim last N messages sebagai context ke Gemini
5. **Auto-save** — Setiap exchange tersimpan ke `chat_history`

### Output Day 3
- ✅ AI bisa "mewawancarai" UMKM secara natural
- ✅ Guided flow dari identitas → keuangan → dokumen
- ✅ Semua percakapan tersimpan

---

## 🗓️ DAY 4 — Azure OCR Integration (Document Upload)

### Objectives
- Upload foto dokumen (nota, struk, buku kas) via chat
- Ekstrak data numerik menggunakan Azure AI Document Intelligence

### Tasks
1. **Upload Widget** — Komponen upload gambar di chat (drag & drop + camera)
2. **`document_ocr.py`** — Azure Document Intelligence client wrapper
3. **`POST /upload-document`** — Terima image, kirim ke Azure OCR, return extracted data
4. **OCR Result Parser** — Parse Azure response → structured JSON (total, items, tanggal)
5. **Chat Integration** — OCR result otomatis di-inject ke conversation context

### Output Day 4
- ✅ User bisa upload foto nota/struk di chat
- ✅ Azure OCR ekstrak angka otomatis
- ✅ Data hasil OCR masuk ke konteks wawancara AI

---

## 🗓️ DAY 5 — Geospatial & Location Scoring

### Objectives
- Implementasi input lokasi (map pin / alamat)
- Hitung location score berdasarkan koordinat

### Tasks
1. **Map Component** — Leaflet.js map picker di chat (pin lokasi usaha)
2. **Geocoding** — Konversi alamat ↔ koordinat (OpenStreetMap Nominatim API)
3. **`POST /geoscore`** — Endpoint hitung skor lokasi
4. **Location Scoring Logic:**
   - Jarak ke pasar/pusat ekonomi terdekat (OSM data)
   - Kepadatan bisnis radius 500m (Overpass API)
   - Akses infrastruktur (jalan utama, bank)
5. **Score Normalization** — Output skor lokasi 0–100

### Output Day 5
- ✅ User bisa pin lokasi usaha di peta
- ✅ Skor lokasi otomatis terhitung (0–100)
- ✅ Faktor geospasial masuk ke total credit score

---

## 🗓️ DAY 6 — Scoring Engine v0 (Heuristik)

### Objectives
- Build scoring pipeline berdasarkan `SCORING_RULES.md`
- Implement data extraction dari chat history

### Tasks
1. **Chat Data Extractor** — Gemini prompt khusus: ekstrak seluruh chat → JSON terstruktur
2. **Scoring Functions:**
   - `score_financial()` — omzet, pengeluaran, profit ratio
   - `score_experience()` — lama usaha, jumlah karyawan
   - `score_location()` — dari Day 5
   - `score_document_trust()` — ada/tidaknya dokumen OCR verified
   - `score_character()` — sentiment dari gaya bahasa (Gemini)
3. **`POST /calculate-score`** — Aggregate semua sub-skor → final score (300–850)
4. **Bobot Default:** 35% Finansial + 20% Pengalaman + 15% Lokasi + 15% Dokumen + 15% Karakter
5. **Simpan ke `credit_assessments`**

### Output Day 6
- ✅ Scoring engine fungsional
- ✅ Sub-skor per dimensi
- ✅ Final credit score 300–850

---

## 🗓️ DAY 7 — Dashboard & Score Card (Frontend)

### Objectives
- Visualisasi hasil credit scoring
- Build interactive score card dashboard

### Tasks
1. **Score Card Page** — Route `/dashboard/[session_id]`
2. **Speedometer Component** — Gauge chart untuk final score (300–850)
3. **Breakdown Cards** — Card per dimensi skor (Finansial, Pengalaman, Lokasi, dll)
4. **Radar Chart** — Spider chart semua dimensi menggunakan Recharts
5. **Risk Badge** — Label risiko: Very Low / Low / Medium / High / Very High
6. **Explainability Section** — AI-generated narasi penjelasan skor (Gemini)
7. **PDF Export** — Tombol download Credit Report sebagai PDF

### Output Day 7
- ✅ Dashboard visual lengkap
- ✅ Score card interaktif + breakdown
- ✅ Risk classification
- ✅ AI explanation dalam bahasa Indonesia

---

## 🗓️ DAY 8 — Advanced Features + Polish

### Objectives
- Fitur tambahan yang bikin "wow" untuk juri
- Polish UX keseluruhan

### Tasks
1. **Sentiment Analysis** — Analisis gaya bahasa UMKM selama wawancara (via Gemini)
2. **Data Consistency Check** — Cross-check omzet self-reported vs OCR dokumen
3. **Basic vs Advanced Model:**
   - Basic: Hanya input wajib (chatbot flow cepat ~5 menit)
   - Advanced: + input opsional (marketplace link, psikometrik, dll)
4. **Loading States & Animations** — Skeleton loaders, typing indicator, smooth transitions
5. **Error Handling** — Graceful fallback jika Azure/Gemini timeout
6. **Mobile Responsive** — Pastikan chat & dashboard mobile-friendly

### Output Day 8
- ✅ Sentiment analysis aktif
- ✅ Basic/Advanced mode switching
- ✅ UX polished & responsive

---

## 🗓️ DAY 9 — Integration Testing + Demo Data

### Objectives
- End-to-end testing full flow
- Siapkan demo scenario

### Tasks
1. **E2E Test Flow:**
   - Buat akun → Mulai session → Chat interview → Upload dokumen → Pin lokasi → Lihat score
2. **Demo UMKM Profiles** — Siapkan 3 persona:
   - "Warung Bu Sari" (skor tinggi, data lengkap)
   - "Toko Online Budi" (skor menengah, tanpa dokumen)
   - "Jasa Ojek Andi" (skor rendah, data minimal)
3. **Seed Data** — Script untuk populate demo data ke Supabase
4. **Bug Fixes** — Fix semua bugs dari testing
5. **Performance Check** — Pastikan response time < 3 detik per chat turn

### Output Day 9
- ✅ Full flow berjalan tanpa error
- ✅ 3 demo profiles siap
- ✅ Performance acceptable

---

## 🗓️ DAY 10 — Deployment & Presentation Prep

### Objectives
- Deploy semua ke production
- Siapkan materi presentasi

### Tasks
1. **Deploy Frontend** — Push ke Vercel, setup env vars, custom domain (opsional)
2. **Deploy Backend** — Push ke Render.com, setup env vars, setup cron-job.org keep-alive
3. **Supabase Production** — Pastikan RLS policies aktif, backup data
4. **Smoke Test** — Test production URL end-to-end
5. **Presentation Deck:**
   - Problem statement (drop-off rate form tradisional)
   - Solution (AI conversational interview)
   - Live demo flow
   - Tech architecture diagram
   - Future roadmap (ML model, marketplace integration)
6. **README.md** — Dokumentasi repo lengkap

### Output Day 10
- ✅ Production live & accessible
- ✅ Presentasi siap
- ✅ Dokumentasi lengkap

---

## 📊 Risk Mitigation

| Risk | Mitigation |
|---|---|
| Azure free tier limit (500 pages/bulan) | Batch OCR requests, cache results, gunakan mock data untuk testing |
| Gemini API rate limit | Implement retry + exponential backoff, cache common responses |
| Render.com cold start | Setup cron-job.org ping setiap 5 menit |
| Supabase free tier limit | Optimize queries, implement pagination, cleanup old sessions |
| Time overrun | Day 8 features bisa di-cut jika tertinggal, fokus Day 1–7 = MVP |

---

## 🎯 Definition of Done (MVP)

Prototipe dianggap **SELESAI** jika memenuhi:
1. ✅ UMKM bisa "diwawancarai" via chat AI
2. ✅ Upload dokumen → OCR extract data otomatis
3. ✅ Pin lokasi → skor lokasi terhitung
4. ✅ Credit score 300–850 tergenerate
5. ✅ Dashboard visual menampilkan score card + breakdown
6. ✅ Deployed & accessible via public URL







Semua file yang ada di projek ini gak fix masih sangat boleh adanya perubahan dan improvisasi agar lebih maximal, baik itu tech, file file planning dan lain sebagainya