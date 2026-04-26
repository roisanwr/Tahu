# 🔑 API Keys & Services Checklist — TAHU Platform

> Kumpulkan semua ini sebelum mulai implementasi backend.  
> **JANGAN commit file .env ke git!**

---

## ✅ RINGKASAN: Apa yang Dibutuhkan

| # | Service | Untuk Apa | Gratis? | Link |
|---|---------|-----------|---------|------|
| 1 | **Supabase** | Database + Auth + Storage | ✅ Free tier | [supabase.com](https://supabase.com) |
| 2 | **Google OAuth** | Login "Masuk dengan Google" | ✅ Gratis | [console.cloud.google.com](https://console.cloud.google.com) |
| 3 | **Gemini API** | RINA chatbot AI | ✅ Free tier ada | [aistudio.google.com](https://aistudio.google.com/) |
| 4 | **Azure AI Document Intelligence** | OCR nota/struk/buku kas | ✅ Free F0 (500 page/bln) | [portal.azure.com](https://portal.azure.com) |
| 5 | **Render.com** | Deploy backend FastAPI | ✅ Free tier | [render.com](https://render.com) |
| 6 | **Vercel** | Deploy frontend Next.js | ✅ Free tier | [vercel.com](https://vercel.com) |

---

## 1️⃣ SUPABASE

**Kenapa:** Database PostgreSQL + Authentication + File Storage. Gak perlu manage server sendiri.

### Yang didapat dari Supabase:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # Untuk FRONTEND
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Untuk BACKEND ONLY
```

### Cara ambil:
1. Login → pilih project → **Project Settings** (icon gear)
2. Klik **API** di sidebar
3. Copy: **Project URL**, **anon public**, **service_role** (klik "Reveal")

> ⚠️ **service_role key bypass semua RLS** — HANYA untuk backend server, JANGAN expose ke frontend!

---

## 2️⃣ GOOGLE OAUTH (untuk tombol "Masuk dengan Google")

**Kenapa:** User login pakai akun Google mereka. Supabase yang handle token management-nya — kita cukup kasih Client ID + Secret.

### Yang didapat dari GCP:
```env
GOOGLE_CLIENT_ID=1234567890-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cara setup (step by step):

#### Di Google Cloud Console:
1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru → nama: `TAHU` (atau pakai existing)
3. Search **"OAuth consent screen"** → pilih
4. Isi:
   - User Type: **External**
   - App name: `TAHU`
   - User support email: email kamu
   - Scopes: tambah `email`, `profile`, `openid` (klik "Add or Remove Scopes")
   - Test users: tambah email kamu sendiri dulu
   - Save
5. Kembali ke **Credentials** → **+ Create Credentials** → **OAuth Client ID**
6. Application type: **Web application**
7. Name: `TAHU Web`
8. **Authorized JavaScript origins** (tambahkan semua):
   ```
   http://localhost:3000
   https://[nama-project-kamu].vercel.app
   ```
9. **Authorized redirect URIs** (PENTING — harus exact match):
   ```

   brlom yang mana

   
   https://[supabase-ref].supabase.co/auth/v1/callback
   ```
   *(Supabase ref = bagian sebelum `.supabase.co` dari URL project kamu)*
10. Klik **Create** → Copy **Client ID** dan **Client Secret**

#### Di Supabase Dashboard:
1. **Authentication** → **Providers** → cari **Google** → Enable
2. Paste **Client ID** dan **Client Secret**
3. **Save**

> Setelah ini, tombol "Masuk dengan Google" langsung bisa dipakai!

---

## 3️⃣ GEMINI API (RINA chatbot)

**Kenapa:** RINA (chatbot AI-nya) pakai Gemini untuk memahami jawaban user dan mengekstrak data scoring.

### Yang didapat:
```env
GEMINI_API_KEY=AIzaSy-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cara ambil:
1. Buka [aistudio.google.com](https://aistudio.google.com/)
2. Login dengan Google
3. **Get API Key** (di pojok kanan)
4. **Create API Key** → copy nilainya

### Free tier Gemini:
- **Gemini 1.5 Flash:** 15 RPM (requests per minute), 1M tokens/day — **cukup untuk prototype**
- Kalau rate limit kena, implementasi exponential backoff di backend

---

## 4️⃣ AZURE AI DOCUMENT INTELLIGENCE (OCR)

**Kenapa:** Untuk baca nota, struk, buku kas yang di-upload user. Lebih akurat dari OCR biasa untuk dokumen keuangan.

### Yang didapat:
```env
AZURE_DOCUMENT_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_DOCUMENT_ENDPOINT=https://[nama-resource].cognitiveservices.azure.com/
```

### Cara setup:
1. Buka [portal.azure.com](https://portal.azure.com) (login dengan akun Microsoft/email apapun)
2. **+ Create a resource** → search **"Document Intelligence"** → Create
3. Isi:
   - Subscription: Free Trial atau pay-as-you-go
   - Resource group: buat baru → nama `tahu-rg`
   - Region: **Southeast Asia**
   - Name: `tahu-ocr` (nama unik)
   - **Pricing tier: F0 (Free)** ← PILIH INI
4. **Review + Create** → Create
5. Setelah deployed → **Go to Resource**
6. Di sidebar kiri: **Keys and Endpoint**
7. Copy **KEY 1** dan **Endpoint**

### Free F0 limits:
- 500 pages/bulan gratis
- Cukup untuk demo dan prototype

---

## 5️⃣ RENDER.COM (Deploy Backend)

**Kenapa:** Hosting backend FastAPI. Free tier = cukup untuk prototype (sleep setelah 15 menit inaktif).

### Yang dibutuhkan:
- Akun Render.com (daftar pakai GitHub)
- Repo GitHub yang sudah terhubung

### Variabel yang di-set di Render:
Semua .env yang ada di backend

---

## 6️⃣ VERCEL (Deploy Frontend — sudah setup sebelumnya)

Frontend Next.js sudah di-deploy ke Vercel.  
Yang perlu ditambah ke Vercel environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=https://[nama-backend].onrender.com/v1
```

---

## 📄 Template .env Backend (Lengkap)

Simpan di `backend/.env` — **JANGAN commit ke git!**

```env
# ============================================================
# TAHU Backend — Environment Variables
# Copy ini ke .env, isi semua value, jangan pernah commit!
# ============================================================

# ── Supabase ─────────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # Settings → API → service_role

# ── Google (untuk verifikasi token Google dari frontend) ─────
# Tidak wajib di backend kalau pakai Supabase JWT verification
# GOOGLE_CLIENT_ID=...

# ── Gemini AI ────────────────────────────────────────────────
GEMINI_API_KEY=AIzaSy-...               # aistudio.google.com

# ── Azure AI Document Intelligence ──────────────────────────
AZURE_DOCUMENT_KEY=xxxxxxxxxxxxxxxx     # Azure Portal → Resource → Keys
AZURE_DOCUMENT_ENDPOINT=https://xxxx.cognitiveservices.azure.com/

# ── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://[project].vercel.app

# ── App Config ───────────────────────────────────────────────
APP_ENV=development                     # development | production
APP_VERSION=0.1.0
```

## 📄 Template .env.local Frontend (Next.js)

Simpan di `frontend/.env.local`:

```env
# ── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # Settings → API → anon public
                                              # BUKAN service_role!

# ── Backend API ──────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000/v1   # Development
# NEXT_PUBLIC_API_URL=https://[nama].onrender.com/v1  # Production
```

---

## ✅ Checklist Sebelum Implementasi

```
[ ] Supabase project dibuat (region: Singapore)
[ ] Supabase URL, anon key, service_role key sudah dicopy
[ ] Google OAuth: GCP project dibuat + consent screen configured
[ ] Google OAuth: Client ID + Secret didapat
[ ] Google OAuth: redirect URI sudah diisi (supabase.co/auth/v1/callback)
[ ] Google OAuth: sudah dipasang di Supabase → Authentication → Google
[ ] Gemini API key didapat dari AI Studio
[ ] Azure Document Intelligence resource dibuat (tier F0)
[ ] Azure Key + Endpoint sudah dicopy
[ ] Semua keys sudah masuk ke backend/.env
[ ] Semua keys frontend sudah masuk ke frontend/.env.local
[ ] .gitignore sudah include .env, .env.local, .env.* 
```

---

*Last updated: April 2026*
