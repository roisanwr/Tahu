# 🗺️ ROADMAP skorinaja — Ke Mana Selanjutnya?
> Dibuat: 23 April 2026 | Berdasarkan status proyek aktual saat ini

---

## 📊 Di Mana Kita Sekarang?

Sebelum merencanakan ke depan, kita perlu jujur tentang status saat ini:

| Komponen | Status | Kondisi |
|---|---|---|
| **Frontend UI** | ✅ Selesai | Production-quality prototype, semua halaman & komponen jalan |
| **Design System** | ✅ Selesai | Tokens, animasi GSAP, mobile-first |
| **UX Unhappy Paths** | ✅ Selesai | GPS cancel, OCR fail, Edit chat terakhir |
| **Backend Boilerplate** | ⚠️ Skeleton | `main.py`, router stubs ada — tapi **semua isinya placeholder** |
| **AI Agent (Gemini)** | ❌ Belum | `ai_agent.py` ada tapi stub, belum nyambung sama sekali |
| **Database** | ❌ Belum | Schema `DB_SCHEMA_V2.sql` ada di docs, **belum di-deploy ke Supabase** |
| **Auth (Google OAuth)** | ❌ Belum | Mock login di frontend, belum ada Supabase Auth nyata |
| **OCR (Azure)** | ❌ Belum | `document_ocr.py` ada, belum terhubung ke API key Azure |
| **Scoring Engine** | ❌ Belum | Formula ada di `SCORING_RULES.md`, belum dikodekan |
| **Deployment** | ❌ Belum | Masih localhost semua |

**Kesimpulan:** Frontend kita sudah di **Day 7-8** dari MASTER_PLAN, tapi backend masih di **Day 1**. Gap ini yang akan kita tutup sekarang.

---

## 🎯 Target Akhir

> **MVP yang bisa jalan end-to-end:**
> UMKM masuk → ngobrol sama AI nyata → upload dokumen → skor keluar → dashboard real.
> Semua berjalan di URL publik tanpa localhost.

---

## 📅 6 Fase Eksekusi

---

### FASE 1 — Database & Auth Foundation
**Estimasi: 1–2 hari**

Ini adalah fondasi. Jangan lanjut ke mana pun sebelum ini beres.

**Yang harus dikerjakan:**

1. **Deploy Schema ke Supabase**
   - Buka Supabase Dashboard → SQL Editor
   - Jalankan `docs/DB_SCHEMA_V2.sql`
   - Verifikasi tabel: `users`, `assessment_sessions`, `chat_history`, `credit_assessments`, `business_profiles`, `uploaded_documents`

2. **Aktifkan Google OAuth di Supabase**
   - Supabase → Authentication → Providers → Google
   - Daftarkan OAuth App di Google Cloud Console
   - Tambahkan Redirect URL dari Supabase ke Google Console

3. **Sambungkan Frontend ke Supabase Auth (real)**
   - Ganti `MOCK_GOOGLE_USER` di `useChatLogic.ts` dengan Supabase `signInWithOAuth({ provider: 'google' })`
   - Ganti `AuthContext` mock dengan hook dari `@supabase/ssr`
   - Set `NEXT_PUBLIC_SUPABASE_URL` dan `ANON_KEY` di `.env`

**✅ Ukuran Sukses:** Klik "Masuk dengan Google" → real Google popup → user tersimpan di DB Supabase.

---

### FASE 2 — Backend API Hidup
**Estimasi: 2–3 hari**

Backend sudah ada strukturnya, tinggal mengisi konten yang sebenarnya.

**2a. Sambungkan Backend ke Supabase**
```python
# backend/database.py
from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

**2b. Router Sessions (CRUD)**
- `POST /v1/sessions` → buat baris di `assessment_sessions`
- `GET /v1/sessions/{id}` → ambil status sesi

**2c. Router Chat**
- `POST /v1/chat` → terima pesan user → simpan ke `chat_history` → return response
- Boleh masih stub response dulu — yang penting data masuk DB

**2d. Route Handler Next.js sebagai proxy**
- Buat `app/api/chat/route.ts` yang forward ke FastAPI
- Ini menghindari masalah CORS dari browser ke FastAPI langsung

**✅ Ukuran Sukses:** Kirim pesan di chat → tersimpan di `chat_history` Supabase → response balik ke UI.

---

### FASE 3 — AI Gemini Integration
**Estimasi: 1–2 hari**

Bagian yang paling "wow" dan jadi pembeda utama proyek ini.

1. **Aktifkan `ai_agent.py`**
   ```python
   import google.generativeai as genai
   genai.configure(api_key=GEMINI_API_KEY)
   model = genai.GenerativeModel("gemini-1.5-flash")
   ```

2. **Pasang System Prompt dari `docs/PROMPTS.md`**
   - Persona: interviewer kredit yang ramah & cerdas
   - Flow: intro → profil → keuangan → dokumen → lokasi → summary
   - Setiap response harus sertakan JSON ekstraksi data

3. **State Machine Chat di Backend**
   - Backend yang pegang `interview_stage`, bukan frontend
   - Response API selalu sertakan `next_stage` + `ui_component` trigger

4. **Ganti setTimeout mock di Frontend**
   - Hapus seluruh `if (currentStep === 1)... setTimeout...` di `useChatLogic.ts`
   - Gantikan dengan satu `fetch('POST /api/chat')` yang return AI response + trigger

**✅ Ukuran Sukses:** Chat dengan AI nyata yang mengingat konteks percakapan sebelumnya.

---

### FASE 4 — OCR & Lokasi
**Estimasi: 1–2 hari**

Dua fitur teknis yang jadi nilai jual utama.

**4a. Azure OCR:**
- Daftar Azure AI Document Intelligence (free tier 500 pages/bulan)
- Isi `AZURE_ENDPOINT` dan `AZURE_KEY` di `.env`
- Aktifkan `document_ocr.py` → `POST /v1/upload-document`
- Flow: Upload gambar → simpan ke Supabase Storage → URL dikirim ke Azure OCR → hasil masuk context AI

**4b. Geospatial Scoring:**
- Nominatim API (gratis, OpenStreetMap) untuk geocoding
- Overpass API (gratis) untuk kepadatan bisnis radius 500m
- Implementasikan `score_location()` sesuai `SCORING_RULES.md`

**✅ Ukuran Sukses:** Upload foto nota → angka terekstrak otomatis → masuk ke perhitungan skor.

---

### FASE 5 — Scoring Engine & Dashboard Real
**Estimasi: 1–2 hari**

Menyatukan semua data menjadi skor final yang bermakna.

1. **`POST /v1/calculate-score`**
   - Panggil Gemini untuk ekstrak data dari seluruh `chat_history`
   - Jalankan 5 scoring functions sesuai `SCORING_RULES.md`
   - Weighted: 35% Finansial + 20% Pengalaman + 15% Lokasi + 15% Dokumen + 15% Karakter
   - Simpan ke tabel `credit_assessments`

2. **Hubungkan Dashboard ke API real**
   - Ganti `MOCK_SESSIONS` di `[session_id]/page.tsx` dengan `GET /v1/assessments/{id}`
   - Ganti daftar sidebar dengan `GET /v1/business-profiles?user_id=`
   - Hubungkan `EditProfileModal` ke `PATCH /v1/business-profiles/{id}`

3. **Generate AI Explanation**
   - Setelah skor dihitung, generate narasi bahasa Indonesia untuk `AIExplanationCard`

**✅ Ukuran Sukses:** Selesai chat → skor nyata muncul di dashboard dari data percakapan.

---

### FASE 6 — Deployment & Going Live
**Estimasi: 1 hari**

**Frontend → Vercel:**
```bash
vercel --prod
# Set: NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, NEXT_PUBLIC_API_URL
```

**Backend → Render.com:**
```
Build: pip install -r requirements.txt
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Set: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY, AZURE_KEY, ALLOWED_ORIGINS
```

**Keep-alive:** Setup cron-job.org ping `GET {backend}/v1/health` setiap 5 menit (Render sleep setelah 15 menit idle — fatal untuk demo).

**✅ Ukuran Sukses:** URL publik bisa dibuka siapapun dari HP, full flow jalan.

---

## ⚡ Urutan Eksekusi 11 Langkah

```
1. Deploy DB Schema ke Supabase          ← 30 menit
2. Setup Google OAuth di Supabase        ← 1 jam
3. Ganti mock auth frontend dengan real  ← 2 jam
4. Koneksi backend ke Supabase DB        ← 1 jam
5. POST /chat menyimpan message ke DB    ← 2 jam
   ──── MILESTONE: Data masuk DB ────
6. Integrasi Gemini di ai_agent.py       ← 3 jam
7. Frontend kirim ke API, bukan mock     ← 2 jam
   ──── MILESTONE: AI nyata ngobrol ────
8. Azure OCR aktif                       ← 2 jam
9. Scoring engine dikodekan              ← 4 jam
10. Dashboard dari API real              ← 2 jam
    ──── MILESTONE: MVP fungsional ────
11. Deploy Vercel + Render               ← 3 jam
    ──── MILESTONE: Public URL ────
```

**Total estimasi: ~3–5 hari kerja fokus.**

---

## 💡 Saran Strategis (Jujur)

### Jangan lakukan ini:

**❌ Jangan langsung main Gemini dulu**  
Godaan terbesar adalah langsung integrasi AI. Tapi kalau DB belum ada, semua output AI hilang. Auth + DB harus beres dulu.

**❌ Jangan refactor frontend besar-besaran**  
Frontend sudah dirancang backend-agnostic. Cukup ganti satu `setTimeout` → satu `fetch`, komponen per komponen. Jangan sentuh yang tidak perlu.

**❌ Jangan aktifkan RLS Supabase dulu**  
Di tahap dev, disable Row Level Security dulu. Aktifkan baru saat mau production. RLS yang salah konfigurasi akan blok semua request tanpa pesan error yang jelas.

### Lakukan ini:

**✅ Satu endpoint nyata per hari**  
Lebih baik satu endpoint end-to-end yang benar dari frontend sampai DB ketimbang 10 endpoint setengah jalan.

**✅ Test di HP sendiri setiap milestone**  
Ini produk untuk UMKM yang pakai HP. Mobile experience harus selalu diverifikasi.

**✅ Simpan semua API key di .env, jangan hardcode**  
Sudah ada contohnya di `.env.example`. Ikuti itu.

---

## 🚨 Risiko yang Perlu Diwaspadai

| Risiko | Dampak | Solusi |
|---|---|---|
| Gemini lambat (3–5 detik/response) | UX terasa laggy | Implementasi streaming response via `text/event-stream` |
| Render cold start saat demo | Demo gagal di depan audience | Wajib setup cron ping + warm-up sebelum presentasi |
| Azure OCR free tier habis | OCR berhenti bekerja | Cache hasil OCR di Supabase — jangan panggil Azure 2x untuk file sama |
| CORS error saat integrasi | Frontend tidak bisa hit backend | Gunakan Next.js API Route Handler sebagai proxy |
| Supabase RLS blok request | Data tidak bisa diakses | Disable RLS di dev, aktifkan saat production dengan policy yang tested |

---

## 🔮 Setelah MVP — Jika Ada Waktu Lebih

Ini bukan prioritas sekarang, tapi bagus untuk disebutkan saat presentasi sebagai roadmap:

- **PDF Export** — Generate laporan kredit sebagai PDF (`weasyprint` Python)
- **Session Recovery** — Auto-save progress chat ke `localStorage`, bisa lanjut kalau tab ditutup
- **Konfirmasi Data** — AI mengonfirmasi ulang angka sebelum dihitung ("Omzet 10 juta/bulan — betul ya?")
- **Perbandingan Skor Antar Sesi** — Grafik tren untuk UMKM yang kembali
- **Admin Panel untuk Lender** — Dashboard melihat semua applicant — membuka potensi B2B

---

## ✅ Aksi Hari Ini (Mulai Dari Sini)

Kalau mau langsung mulai sekarang, lakukan ini satu per satu:

- [ ] Buka Supabase Dashboard → jalankan `docs/DB_SCHEMA_V2.sql`
- [ ] Buka Google Cloud Console → buat OAuth 2.0 Client ID baru
- [ ] Aktifkan Google provider di Supabase Auth Settings
- [ ] Update `.env` frontend: isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Ganti `handleGoogleLogin()` di `useChatLogic.ts` dengan `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [ ] Test: klik login → Google popup muncul → user tercatat di Supabase Database

Kalau satu blok ini selesai hari ini, kita sudah di jalur yang benar. 🎯

---

*Living document — update sesuai progres aktual.*
