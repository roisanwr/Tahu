# PENDAHULUAN — Platform Kredit Scoring UMKM

---

## 1. Latar Belakang

Indonesia memiliki lebih dari 64 juta pelaku UMKM, namun mayoritas masih menghadapi hambatan besar dalam mengakses pembiayaan formal. Proses pengajuan kredit konvensional yang birokratis, formulir panjang, dan persyaratan dokumen yang rumit menyebabkan **tingkat dropout yang sangat tinggi** — banyak pelaku UMKM yang menyerah sebelum proses selesai.

Di sisi lain, lembaga keuangan kesulitan menilai kelayakan kredit UMKM karena minimnya data keuangan formal (laporan keuangan, catatan pajak, rekening koran) dari segmen ini. Ini menciptakan **credit gap** yang signifikan: UMKM butuh modal, tapi bank tidak punya cukup data untuk menilai risiko mereka.

Platform ini hadir sebagai solusi yang mentransformasi proses pengajuan kredit dari **form-based** menjadi **conversation-based** — menggunakan AI chatbot yang mampu melakukan wawancara cerdas, mengekstrak data terstruktur dari percakapan natural, dan menghasilkan credit score berbasis multi-dimensional data.

---

## 2. Tujuan Proyek

### 2.1 Tujuan Utama
Membangun prototype platform kredit scoring berbasis AI yang mampu menilai kelayakan kredit pelaku UMKM melalui antarmuka percakapan yang intuitif, tanpa memerlukan dokumen keuangan formal yang lengkap.

### 2.2 Tujuan Spesifik

1. **Mengurangi Friction Pengajuan Kredit** — Mengganti formulir panjang dengan chatbot interview yang natural dan ramah pengguna, sehingga menurunkan dropout rate secara signifikan.

2. **Menghasilkan Credit Score Multi-Dimensional** — Membangun scoring engine yang menggabungkan data keuangan, psikometrik, geospasial, digital footprint, dan reputasi sosial untuk menghasilkan penilaian kredit yang lebih holistik.

3. **Menyediakan Marketplace Pembiayaan** — Menghubungkan UMKM yang sudah dinilai dengan lembaga keuangan (bank, fintech, investor) melalui dashboard dan API yang terstandarisasi.

4. **Membangun Infrastruktur AI yang Scalable** — Merancang arsitektur hybrid AI (Gemini API + Azure AI) yang mampu menangani chatbot conversation, document analysis (OCR), dan predictive scoring secara efisien.

5. **Memastikan Compliance & Transparansi** — Menyediakan explainability pada setiap keputusan scoring dan format laporan yang sesuai kebutuhan regulator (OJK).

---

## 3. Ruang Lingkup (Scope)

### 3.1 Dalam Scope (MVP — 10 Hari)

| Area | Deskripsi |
|------|-----------|
| **Chatbot Interview** | Conversational UI berbasis Gemini API untuk mengumpulkan data UMKM secara natural |
| **Data Extraction** | Pipeline untuk mengkonversi chat history menjadi structured JSON |
| **Document OCR** | Analisis dokumen (KTP, foto usaha, bukti transaksi) menggunakan Azure AI Document Intelligence |
| **Scoring Engine** | Multi-layer scoring dengan weighted formula dari berbagai dimensi data |
| **Database** | PostgreSQL via Supabase untuk user data, sessions, chat history, dan credit assessments |
| **Dashboard UMKM** | Tampilan hasil score dan rekomendasi untuk pelaku UMKM |
| **API Layer** | FastAPI backend untuk processing dan integrasi |

### 3.2 Di Luar Scope MVP (Fase Berikutnya)

| Area | Deskripsi |
|------|-----------|
| **Lender/Investor Dashboard** | Portal lengkap untuk bank/fintech browsing dan bidding |
| **Disbursement & Monitoring** | Pencairan dana dan monitoring pembayaran |
| **Advanced Fraud Detection** | ML-based fraud detection yang mature |
| **Regulatory Reporting** | Laporan formal untuk OJK |
| **Mobile App** | Aplikasi mobile native |

---

## 4. Technology Stack Overview

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | Next.js (App Router) | Conversational UI, Dashboard |
| **Backend API** | FastAPI (Python) | Scoring engine, data processing |
| **Database** | Supabase (PostgreSQL) | Data persistence, auth |
| **AI — Chatbot** | Gemini API | Conversational interview, data extraction |
| **AI — Document** | Azure AI Document Intelligence | OCR, document analysis |
| **AI — Scoring** | Custom ML models | Predictive credit scoring |
| **Deployment** | Vercel (FE) + Cloud Run/Railway (BE) | Hosting |

---

## 5. Arsitektur Data Flow (Ringkasan)

```
User (UMKM) 
  → Chatbot Interview (Gemini API)
    → Raw Chat History (stored in DB)
      → Data Extraction Pipeline (chat → structured JSON)
        → Validation & Enrichment Layer
          → Multi-Layer Scoring Engine
            → Credit Score + Report
              → Dashboard (UMKM view)
              → API (Lender view — fase 2)
```

---

## 6. AREA ABU-ABU & STATUS PENGEMBANGAN

Bagian ini mendokumentasikan semua area yang **belum final**, **masih dalam eksplorasi**, atau **membutuhkan keputusan teknis lebih lanjut**. Ini adalah living section yang akan terus di-update seiring perkembangan proyek.

### Legend Status:
- 🔴 **BELUM DIMULAI** — Belum ada implementasi atau keputusan
- 🟡 **DALAM EKSPLORASI** — Sudah ada konsep awal tapi belum final
- 🟠 **BUTUH KEPUTUSAN** — Ada opsi-opsi tapi belum dipilih
- 🟢 **PARTIALLY RESOLVED** — Sudah ada arah tapi perlu validasi

---

### 6.1 🔴 Scoring Formula & Bobot (Weight)

**Problem:** Dokumen plan menyebutkan multi-layer scoring engine dengan berbagai dimensi (keuangan, psikometrik, geospasial, digital footprint, reputasi), tapi **formula konkret dan pembobotannya belum didefinisikan**.

**Yang belum jelas:**
- Berapa bobot masing-masing dimensi? (misal: finansial 40%, psikometrik 15%, dst.)
- Bagaimana normalisasi score antar dimensi yang skalanya berbeda?
- Apakah bobot bersifat statis atau dinamis (adaptive berdasarkan kategori usaha)?
- Threshold untuk klasifikasi risk tier (Low / Medium / High / Very High) — angka pastinya berapa?
- Bagaimana handling kalau satu atau lebih dimensi data-nya kosong/tidak tersedia?

**Dampak:** Ini adalah **core logic** platform. Tanpa formula yang jelas, scoring engine tidak bisa diimplementasi.

**Rekomendasi:** Mulai dengan bobot statis sederhana untuk MVP, lalu iterasi berdasarkan data riil.

---

### 6.2 🔴 Fraud Detection Pipeline

**Problem:** Plan menyebutkan fraud detection sebagai komponen penting, tapi **detail implementasinya belum ada sama sekali**.

**Yang belum jelas:**
- Rules apa saja yang dipakai untuk flag suspicious application?
- Apakah fraud detection berbasis rule-based, ML-based, atau hybrid?
- Data sinyal fraud apa yang di-capture? (IP anomaly, behavioral pattern, document tampering)
- Bagaimana alur ketika fraud terdeteksi? (auto-reject, manual review, flagging?)
- Apakah ada integrasi dengan database fraud eksternal?

**Dampak:** Tanpa ini, platform rentan terhadap manipulasi data oleh applicant.

**Rekomendasi:** Untuk MVP, gunakan rule-based sederhana (misal: cek konsistensi data chatbot vs dokumen). ML-based fraud detection masuk fase 2.

---

### 6.3 🟡 Psychometric Scoring Methodology

**Problem:** Psikometrik disebut sebagai salah satu dimensi scoring, tapi **bagaimana cara mengukurnya lewat chatbot belum didefinisikan**.

**Yang belum jelas:**
- Pertanyaan psikometrik apa yang akan diajukan chatbot?
- Framework psikometri yang dipakai? (Big Five? Grit Scale? Custom?)
- Bagaimana cara chatbot menilai jawaban natural language menjadi skor psikometrik?
- Validitas dan reliabilitas assessment via chatbot — apakah bisa diandalkan?
- Apakah perlu kalibrasi cultural untuk konteks Indonesia?

**Dampak:** Jika tidak mature, dimensi ini bisa jadi noise alih-alih signal dalam scoring.

**Rekomendasi:** Riset framework psikometrik yang sudah tervalidasi untuk konteks lending di emerging market. Mulai dengan 5-7 pertanyaan kunci.

---

### 6.4 🟡 Geospatial Data Integration

**Problem:** Plan menyebutkan analisis geospasial (lokasi usaha, kepadatan kompetitor, akses infrastruktur), tapi **sumber data dan metode analisisnya belum jelas**.

**Yang belum jelas:**
- Sumber data geospasial yang dipakai? (Google Maps API? OpenStreetMap? BPS?)
- Metrik apa yang dihitung? (jarak ke pasar, kepadatan kompetitor dalam radius X km, dll.)
- Bagaimana cara convert koordinat GPS menjadi skor?
- Biaya API geospasial — apakah sustainable untuk skala besar?
- Bagaimana handling untuk UMKM yang lokasinya tidak terdeteksi di maps?

**Dampak:** Bisa jadi fitur sangat powerful, tapi juga bisa jadi bottleneck biaya dan kompleksitas.

**Rekomendasi:** MVP hanya capture lokasi (lat/long) dan lakukan enrichment manual. Automated geospatial scoring masuk fase 2.

---

### 6.5 🟠 Digital Footprint Analysis

**Problem:** Input schema menyebutkan berbagai sumber digital footprint (social media, e-commerce, review platform), tapi **cara akses dan analisisnya masih terbuka**.

**Yang belum jelas:**
- Bagaimana cara mendapatkan data social media user? (OAuth? Manual input URL? Scraping?)
- Platform mana yang diprioritaskan? (Instagram, TikTok, Tokopedia, Google Reviews?)
- Legal dan privacy concern — apakah scraping diperbolehkan?
- Metrik apa yang diekstrak? (followers, engagement rate, review sentiment, transaction volume?)
- Bagaimana standardisasi score dari berbagai platform yang sangat berbeda?

**Dampak:** Ini area yang sangat kaya data tapi juga penuh risiko legal dan teknis.

**Rekomendasi:** Untuk MVP, hanya terima URL yang di-share voluntarily oleh user, dan lakukan basic sentiment analysis. Tidak scraping.

---

### 6.6 🟠 Chatbot Conversation Design (Prompt Engineering)

**Problem:** Arsitektur chatbot (Gemini API) sudah didefinisikan, tapi **detail conversation flow dan prompt strategy-nya belum**.

**Yang belum jelas:**
- System prompt lengkap untuk Gemini — tone, batasan, dan instruksi extraction
- Conversation tree / flow diagram: urutan topik yang ditanyakan
- Bagaimana chatbot handle jawaban yang ambigu, tidak relevan, atau user yang uncooperative?
- Berapa panjang ideal satu sesi interview? (jumlah turn, estimasi waktu)
- Bagaimana strategi fallback kalau Gemini API down atau rate limited?
- Multi-language support — apakah chatbot harus bisa Bahasa daerah?

**Dampak:** Kualitas data yang diekstrak sangat bergantung pada kualitas conversation design.

**Rekomendasi:** Buat conversation script draft, test dengan 5-10 user riil, lalu iterasi.

---

### 6.7 🟡 Data Extraction Pipeline (Chat → Structured JSON)

**Problem:** Plan menyebutkan bahwa chat history akan diekstrak menjadi structured data, tapi **mekanisme teknis extraction-nya belum detail**.

**Yang belum jelas:**
- Apakah extraction dilakukan real-time (per message) atau batch (setelah sesi selesai)?
- Prompt/instruction untuk Gemini dalam mode extraction — bagaimana formatnya?
- Bagaimana handling data yang parsial (user belum jawab semua pertanyaan)?
- Confidence scoring untuk setiap extracted field — apakah ada?
- Bagaimana reconciliation kalau user mengubah jawaban di tengah percakapan?

**Dampak:** Garbage in, garbage out. Jika extraction tidak akurat, scoring jadi tidak bermakna.

**Rekomendasi:** Implement extraction dengan confidence score per field. Field dengan confidence rendah bisa di-follow-up oleh chatbot.

---

### 6.8 🔴 API Specification & Contract

**Problem:** FastAPI backend disebutkan sebagai layer processing, tapi **endpoint specification belum dibuat**.

**Yang belum jelas:**
- Daftar lengkap endpoints (REST API)
- Request/response schema per endpoint
- Authentication & authorization strategy (JWT? API key? OAuth?)
- Rate limiting policy
- Error handling standard (error codes, messages)
- Versioning strategy (v1, v2?)

**Dampak:** Tanpa API spec, frontend dan backend tidak bisa develop secara paralel.

**Rekomendasi:** Buat `API_SPEC.md` atau OpenAPI/Swagger definition sebelum coding dimulai.

---

### 6.9 🔴 Database Schema (Detail Implementation)

**Problem:** Plan2.md menyebutkan tabel-tabel utama (users, sessions, chat_history, credit_assessments), tapi **schema detail dengan kolom, tipe data, constraints, dan relasi belum dibuat**.

**Yang belum jelas:**
- Kolom lengkap per tabel dengan tipe data
- Foreign key relationships dan cascading rules
- Indexing strategy untuk query performance
- Partitioning strategy untuk chat_history (yang bisa sangat besar)
- Row Level Security (RLS) policies di Supabase
- Migration strategy

**Dampak:** Tanpa schema yang solid, development bisa chaos dan migrasi jadi painful.

**Rekomendasi:** Buat `DB_SCHEMA.sql` dengan DDL lengkap sebelum Day 3 (implementation start).

---

### 6.10 🟡 Azure AI Document Intelligence — Configuration

**Problem:** Azure AI dipakai untuk OCR dan document analysis, tapi **konfigurasi spesifik belum didefinisikan**.

**Yang belum jelas:**
- Model mana yang dipakai? (prebuilt-document, prebuilt-idDocument, custom model?)
- Tipe dokumen yang di-support (KTP, SIUP, foto usaha, struk, rekening koran)
- Bagaimana handling untuk dokumen berkualitas rendah (blur, gelap, miring)?
- Confidence threshold untuk acceptance — berapa minimum yang diterima?
- Fallback flow kalau OCR gagal — manual upload ulang? Skip?
- Cost estimation per document scan

**Dampak:** OCR yang tidak akurat menghasilkan data input yang salah ke scoring engine.

**Rekomendasi:** Test dengan sampel dokumen riil dari UMKM Indonesia. Prioritaskan KTP dan foto usaha untuk MVP.

---

### 6.11 🟠 Deployment & DevOps Pipeline

**Problem:** Deployment target disebutkan (Vercel + Cloud Run/Railway), tapi **CI/CD dan DevOps flow belum disetup**.

**Yang belum jelas:**
- CI/CD pipeline (GitHub Actions? Vercel auto-deploy?)
- Environment strategy (dev, staging, production)
- Secret management (env vars, API keys storage)
- Monitoring & logging strategy
- Error tracking (Sentry? LogRocket?)
- Backup & disaster recovery plan

**Dampak:** Tanpa DevOps yang proper, deployment jadi manual dan error-prone.

**Rekomendasi:** Setup basic CI/CD di Day 1-2, minimal auto-deploy dari main branch.

---

### 6.12 🔴 Lender/Investor Integration Flow

**Problem:** Plan.md menjelaskan flow lengkap untuk investor (verification, browsing, bidding, monitoring), tapi ini **di luar scope MVP dan belum ada desain teknis**.

**Yang belum jelas:**
- Data apa yang di-expose ke lender? (full report, summary, atau anonymized?)
- Matching algorithm — bagaimana mencocokkan UMKM dengan lender yang tepat?
- Negotiation flow — apakah ada mekanisme bidding?
- Legal agreement — smart contract atau manual?
- Privacy concern — consent management untuk sharing data UMKM

**Status:** Out of MVP scope, tapi perlu dipikirkan arsitekturnya dari awal agar tidak blocking nanti.

---

### 6.13 🟡 User Authentication & Authorization

**Problem:** Supabase Auth disebutkan sebagai solusi, tapi **detail implementasinya belum jelas**.

**Yang belum jelas:**
- Auth method: email/password, phone OTP, Google OAuth, atau semua?
- Role-based access: berapa role? (umkm_user, admin, lender — nanti?)
- Session management & token refresh strategy
- Bagaimana integrasi auth antara Next.js frontend dan FastAPI backend?
- Two-factor authentication — perlu atau tidak untuk MVP?

**Dampak:** Auth yang tidak solid = security hole terbesar.

**Rekomendasi:** Gunakan Supabase Auth dengan email + phone OTP untuk MVP. RBAC minimal 2 role (user, admin).

---

### 6.14 🔴 Testing Strategy

**Problem:** Tidak ada dokumen atau rencana testing sama sekali.

**Yang belum jelas:**
- Unit test framework dan coverage target
- Integration test untuk API endpoints
- E2E test untuk chatbot flow
- Load testing — berapa concurrent user yang harus di-handle?
- UAT plan — siapa yang test dan bagaimana feedback loop-nya?

**Dampak:** Tanpa testing, bug akan ditemukan di production oleh end user.

**Rekomendasi:** Minimal setup unit test untuk scoring engine dan integration test untuk API di sprint ini.

---

### 6.15 🟡 Data Privacy & Compliance (PDPA/UU PDP)

**Problem:** Platform mengumpulkan data pribadi sensitif (KTP, lokasi, keuangan), tapi **compliance strategy belum ada**.

**Yang belum jelas:**
- Compliance dengan UU Perlindungan Data Pribadi (UU PDP) Indonesia
- Data retention policy — berapa lama data disimpan?
- Consent management — bagaimana dan kapan user memberikan consent?
- Data encryption at rest dan in transit
- Right to deletion / data portability
- Apakah perlu Data Protection Officer (DPO)?

**Dampak:** Non-compliance bisa berakibat sanksi hukum dan hilangnya trust user.

**Rekomendasi:** Buat privacy policy draft dan consent flow sebelum user testing.

---

## 7. Prioritas Penyelesaian Area Abu-Abu

Berdasarkan dampak dan urgensi terhadap MVP 10 hari:

| Prioritas | Area | Alasan |
|-----------|------|--------|
| **P0 — Blocker** | 6.1 Scoring Formula | Core logic, tanpa ini tidak ada output |
| **P0 — Blocker** | 6.8 API Specification | Blocker untuk parallel development |
| **P0 — Blocker** | 6.9 Database Schema | Blocker untuk semua data operation |
| **P1 — Critical** | 6.6 Chatbot Conversation Design | Menentukan kualitas data input |
| **P1 — Critical** | 6.7 Data Extraction Pipeline | Bridge antara chatbot dan scoring |
| **P1 — Critical** | 6.13 Authentication | Security foundation |
| **P2 — Important** | 6.10 Azure OCR Config | Perlu testing dengan data riil |
| **P2 — Important** | 6.11 DevOps Pipeline | Efisiensi development |
| **P2 — Important** | 6.14 Testing Strategy | Quality assurance |
| **P3 — Nice to Have (MVP)** | 6.2 Fraud Detection | Rule-based sederhana cukup untuk MVP |
| **P3 — Nice to Have (MVP)** | 6.3 Psychometric Scoring | Bisa pakai simplified version dulu |
| **P3 — Nice to Have (MVP)** | 6.15 Data Privacy | Penting tapi bisa draft dulu |
| **P4 — Post-MVP** | 6.4 Geospatial Analysis | Kompleks, masuk fase 2 |
| **P4 — Post-MVP** | 6.5 Digital Footprint | Legal concern tinggi |
| **P4 — Post-MVP** | 6.12 Lender Integration | Out of MVP scope |

---

## 8. Dokumen Pendukung yang Perlu Dibuat

| No | Nama File | Status | Target |
|----|-----------|--------|--------|
| 1 | `DB_SCHEMA.sql` | 🔴 Belum dibuat | Day 2 |
| 2 | `API_SPEC.md` | 🔴 Belum dibuat | Day 2 |
| 3 | `SCORING_FORMULA.md` | 🔴 Belum dibuat | Day 2-3 |
| 4 | `CONVERSATION_FLOW.md` | 🔴 Belum dibuat | Day 3 |
| 5 | `PRIVACY_POLICY_DRAFT.md` | 🔴 Belum dibuat | Day 4 |
| 6 | `TESTING_PLAN.md` | 🔴 Belum dibuat | Day 4 |
| 7 | `DEVOPS_SETUP.md` | 🔴 Belum dibuat | Day 1-2 |

---

> **Catatan:** Dokumen ini adalah *living document*. Setiap kali area abu-abu resolved atau ada keputusan baru, update status dan catatannya di sini. Format commit yang disarankan: `docs: update PENDAHULUAN — resolve area 6.X [nama area]`
