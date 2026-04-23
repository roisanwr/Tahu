# TAHU Frontend — Dokumentasi Teknis & Arsitektur
> **Status:** Production-Ready Prototype (Backend Integration Phase Ready)  
> **Stack:** Next.js 16.2.4 · React 19 · TypeScript · GSAP 3 · Recharts · Supabase JS  
> **Terakhir diperbarui:** 23 April 2026

---

## 1. Gambaran Umum Proyek

**TAHU (Teknologi Analisis Hablur Usaha)** adalah platform penilaian kredit UMKM berbasis AI. Alih-alih formulir panjang yang membingungkan, user diajak *ngobrol* santai melalui chatbot AI yang cerdas, kemudian sistem menganalisis data yang terkumpul dan menghasilkan **Credit Score terstruktur** dengan visualisasi dashboard yang premium.

### Filosofi Desain

- **Conversational-first** — Pintunya selalu lewat chat, bukan form langsung.
- **Trustworthy & Professional** — Visual harus membangkitkan kepercayaan dari UMKM yang awam teknologi.
- **Mobile-first** — Mayoritas pengguna UMKM mengakses lewat HP.
- **Backend-agnostic** — Semua state UI dirancang siap terima data real dari API tanpa refactor besar.

---

## 2. Struktur Direktori

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (font, AuthProvider)
│   ├── page.tsx                  # Root redirect ke /landing
│   ├── globals.css               # Design system tokens
│   ├── landing/                  # Halaman Marketing
│   │   └── page.tsx
│   ├── chat/                     # Halaman Chat Utama
│   │   └── page.tsx
│   └── dashboard/                # Halaman Dasbor
│       ├── page.tsx              # Overview semua sesi
│       └── [session_id]/
│           └── page.tsx          # Detail satu sesi asesmen
│
├── components/
│   ├── chat/                     # Komponen Chat Interface
│   │   ├── ChatBubble.tsx
│   │   ├── ChatDrawer.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatLogin.tsx
│   │   ├── ChatTypingIndicator.tsx
│   │   ├── MapBottomSheet.tsx
│   │   ├── OCRScanningOverlay.tsx
│   │   └── ResumeBanner.tsx
│   ├── dashboard/                # Komponen Dashboard & Visualisasi
│   │   ├── AIExplanationCard.tsx
│   │   ├── CreditGauge.tsx       # Gauge meter semi-lingkaran
│   │   ├── DashboardHeader.tsx
│   │   ├── EditProfileModal.tsx  # Form edit profil usaha
│   │   ├── LoadingSkeleton.tsx   # Skeleton loader
│   │   ├── LoanBanner.tsx        # Banner rekomendasi pinjaman
│   │   ├── RadarChart.tsx        # Spider chart 5 dimensi
│   │   ├── RiskBadge.tsx         # Badge level risiko (Rendah/Sedang/Tinggi)
│   │   ├── ScoreBreakdownBar.tsx # (unused sementara, disimpan untuk V2)
│   │   └── SubScoreCard.tsx      # Kartu metrik dengan badge bobot
│   └── icons/
│       └── TahuLogo.tsx
│
├── hooks/
│   └── useChatLogic.ts           # Core state machine chat
│
└── lib/
    ├── auth-context.tsx          # Global AuthContext (React Context + sessionStorage)
    └── supabase.ts               # Supabase client (siap pakai)
```

---

## 3. Design System

Seluruh token desain didefinisikan di `app/globals.css` dan direfleksikan sebagai CSS Custom Properties (bukan Tailwind utility). Pendekatan ini memudahkan theming dan konsistensi tanpa ketergantungan kelas Tailwind.

### Warna Brand

| Token                   | Nilai       | Kegunaan                           |
|-------------------------|-------------|-------------------------------------|
| `--color-accent`        | `#0D6B4F`   | Warna utama (hijau emerald gelap)   |
| `--color-accent-light`  | `#E8F5EF`   | Background tint untuk elemen aktif  |
| `--color-accent-dark`   | `#094D39`   | Hover state tombol utama            |
| `--color-navy`          | `#1B2A4A`   | Headline dan teks penting           |
| `--color-bg`            | `#FAFAF8`   | Background halaman (warm white)     |
| `--color-surface`       | `#FFFFFF`   | Card dan modal                      |
| `--color-text-muted`    | `#8A8A84`   | Label, timestamp, metadata          |
| `--color-border`        | `#E8E8E4`   | Border elemen (tinted, bukan gray!) |

### Tipografi

- **Font Utama:** `Plus Jakarta Sans` (via `next/font/google`) — weight: 400, 500, 600, 700, 800
- **Font Aksen:** `Playfair Display` — digunakan di beberapa heading premium landing page
- **Skala:** Rasio 1.25 (Major Third), dari `--text-xs` (12px) hingga `--text-display` (61px)

### Motion (GSAP)

Semua animasi menggunakan GSAP 3 dengan `@gsap/react` hook (`useGSAP`). Pola standar:
- **Entrance:** `fromTo({ opacity: 0, y: 20 }, { opacity: 1, y: 0 })` dengan `back.out` easing
- **Bubble chat:** Slide dari kiri (bot) atau kanan (user) dengan `scale: 0.85` awal
- **Dashboard:** Staggered reveal per section — hero → gauge → cards → CTA
- **Modal (EditProfile, MapBottomSheet):** Scale + fade dengan `back.out(1.1)`

---

## 4. Alur User Journey

```
[Landing Page]
      │
      ▼
[/chat] ── Chatbot TAHU memulai percakapan
      │
      Step 1: Nama & jenis usaha
      │
      Step 2: Lama operasi usaha
      │
      Step 3: Lokasi (via GPS Map Widget  atau  ketik manual)
      │
      Step 4: Upload dokumen transaksi (OCR Scan  atau  ketik manual)
      │
      Step 5: Login Google (wajib untuk simpan hasil)
      │
      ▼
[/dashboard/{session_id}] ── Halaman detail skor & analisis AI
      │
      ▼
[/dashboard] ── Overview semua sesi penilaian
```

### Detail Percabangan Alur

| Titik Percabangan | Happy Path | Unhappy Path |
|---|---|---|
| Lokasi GPS | User klik "Bagikan Lokasi" di `MapBottomSheet` | User klik "Tolak Akses & Ketik Manual" → AI pivot ke teks |
| OCR Dokumen | Scan sukses → `onComplete` dipanggil | User klik "Batalkan Scan / Gagal" → AI minta ketik angka manual |
| Typo di chat | — | User klik ✏️ pada bubble terakhir → pesan ditarik, dikembalikan ke input |
| Sesi belum ada | Dashboard tampil data | Halaman kosong state dengan CTA ke `/chat` |

---

## 5. Arsitektur State

### `useChatLogic.ts` — Core State Machine

Satu-satunya sumber kebenaran untuk seluruh sesi chat. Tidak ada state chat yang dikelola di level halaman.

```typescript
// State yang dikelola
messages        // Message[]  — semua bubble (bot + user)
inputValue      // string     — isi textarea
isTyping        // boolean    — animasi "..." bot mengetik
showLogin       // boolean    — tampilkan komponen ChatLogin
currentStep     // 1–5        — langkah konversasi saat ini

// Handler yang di-expose ke UI
handleSend()         // kirim pesan + logika step machine
handleWidgetAction() // terima event dari widget (location/upload/cancel)
handleUndo()         // tarik balik pesan user terakhir ke input
handleFileUpload()   // setelah OCR selesai dengan sukses
handleFileCancel()   // setelah OCR dibatalkan / gagal
handleGoogleLogin()  // mock login + redirect ke dashboard
```

#### Step Machine (Alur Percakapan)

```
Step 1 → User kirim → Bot tanya lama usaha          → Step 2
Step 2 → User kirim → Bot tampilkan Location Widget  → Step 3
Step 3 → Widget/Text → Bot tampilkan Upload Widget   → Step 4
Step 4 → Widget/Text → Bot tampilkan ChatLogin       → Step 5
Step 5 → Login       → Redirect ke /dashboard/{id}
```

### `AuthContext` — Global Auth State

```typescript
// lib/auth-context.tsx
// Disimpan di sessionStorage (bukan cookies) karena ini masih prototype
const { user, isLoggedIn, login, logout } = useAuth();
```

Saat backend tersambung, `login()` digantikan oleh OAuth callback Supabase.

---

## 6. Komponen Kunci — Penjelasan Detail

### `ChatBubble.tsx`

- Merender semua bubble (bot & user) termasuk widget inline
- Mendukung 4 tipe widget: `location_request`, `location_result`, `upload_request`, `image_result`
- **Fitur Edit:** Bubble user *terbaru* memiliki ikon ✏️ yang muncul saat hover. Diklik → `handleUndo()` dipanggil, menghapus pesan tersebut dan semua respons bot sesudahnya, lalu teks dikembalikan ke textarea.
- `isEditable` hanya `true` untuk bubble user dengan index tertinggi

### `MapBottomSheet.tsx`

- Bottom sheet animasi GSAP yang mengumpulkan lokasi GPS user
- Menampilkan peta mini interaktif saat izin GPS diberikan
- **Unhappy Path:** Tombol "Tolak Akses & Ketik Manual Saja" di bagian bawah memanggil `onCancel()` → `handleWidgetAction("cancel_location")` → bot merespons untuk minta ketik manual

### `OCRScanningOverlay.tsx`

- Overlay 4-tahap: Scanning → Reading → Extracting → Done
- Animasi scan line GSAP yang berjalan bolak-balik
- **Unhappy Path:** Tombol "Batalkan Scan / Gagal" memanggil `onFail()` → `handleFileCancel()` → bot minta ketik angka manual
- Saat ini menggunakan `MOCK_OCR` result; siap diganti API Azure Document Intelligence

### `CreditGauge.tsx`

- Gauge semi-lingkaran berbasis SVG murni
- Zona warna gradasi: Merah (0–400) → Kuning (400–600) → Hijau (600–850)
- Angka skor di-counter animasikan dengan GSAP `fromTo(0, skor)`

### `SubScoreCard.tsx`

- Kartu 5 dimensi skor (Finansial, Pengalaman, Lokasi, Dokumen, Karakter)
- Menampilkan label `status` (`good`/`info`/`warning`) dengan warna badge adaptif
- **V1 Update:** Prop `weight` ditambahkan untuk menampilkan bobot kontribusi (e.g., "Bobot: 35%") — menggantikan `ScoreBreakdownBar` yang dihapus

### `RadarChart.tsx`

- Komponen berbasis `recharts` dengan tampilan spider/radar 5 dimensi
- Warna: aksen hijau emerald dengan area fill transparan
- Satu-satunya visualisasi grafis di halaman detail (ScoreBreakdownBar sudah disingkirkan untuk mengurangi cognitive overload)

### `EditProfileModal.tsx`

- Modal GSAP dengan backdrop blur
- Form 5 field: Nama Usaha, Nama Pemilik, Kategori, Jumlah Karyawan, Alamat
- **Integritas Data:** Catatan eksplisit di form bahwa edit profil tidak mengubah skor yang sudah ada
- Accessible: Diklik di luar modal = menutup, tombol Batal, submit via keyboard

### `LoadingSkeleton.tsx` (`DashboardSkeleton`)

- Komponen skeleton pulsing yang dirender selama data dashboard dimuat
- Ditampilkan selama ±600–800ms (simulasi network delay) sebelum konten nyata masuk
- Mencegah blank screen flash saat GSAP menganimasikan elemen dari `opacity: 0`

### `ChatDrawer.tsx`

- Side drawer navigasi global (hamburger menu)
- **Kondisional berdasarkan status login:**
  - **Tamu:** Hanya tampil tombol "Masuk dengan Google" + tagline info
  - **Login:** Tampil avatar, nama, email + daftar sesi bisnis ("Bisnis Saya") + tombol navigasi Dashboard/Beranda
- Entry point `EditProfileModal` ada di dalam drawer ini (via tombol Settings/Profil)

---

## 7. Halaman — Detail

### `/landing` → Landing Page Marketing

- Hero section dengan tagline + animasi GSAP
- Feature highlights (3 kartu)
- CTA ke `/chat`
- Sepenuhnya static, tidak ada state

### `/chat` → Antarmuka Chat Utama

- Meng-consume seluruh return value dari `useChatLogic`
- GSAP digunakan untuk animasi bubble masuk (berbeda arah berdasarkan sender)
- Auto-scroll ke bawah setiap ada pesan baru
- `ChatHeader` menampilkan progress step (1/5) di sebelah kanan
- Font size chat bisa disesuaikan: Small / Medium / Large (aksesibilitas)

### `/dashboard` → Overview Dashboard

- **3 State UI:**
  1. **Skeleton Loading** (600ms pertama sambil "fetch" data)
  2. **Empty State** — jika `localStorage.tahu_last_session` kosong atau belum login
  3. **Data State** — Gauge + 4 Metric Cards + Loan Banner + CTA ke sesi detail
- GSAP staggered reveal setelah loading selesai
- Link ke `/dashboard/session-demo-001` sebagai demo

### `/dashboard/[session_id]` → Detail Sesi Asesmen

- Data diambil dari `MOCK_SESSIONS` (keyed by `session_id`)
- **Struktur konten dari atas ke bawah:**
  1. Breadcrumb "Kembali ke Dashboard Utama"
  2. Nama UMKM + `RiskBadge` + tanggal sesi
  3. `CreditGauge` score meter
  4. 5x `SubScoreCard` (dengan bobot %)
  5. `RadarChart` 5 dimensi
  6. `AIExplanationCard` — narasi AI penjelasan skor
  7. `LoanBanner` — rekomendasi nominal pinjaman
  8. Tombol "Export PDF" (placeholder)
- **Data sesi demo tersedia:** `session-demo-001`, `session-demo-002`, `session-demo-003`

---

## 8. Data & State Mock (Pre-Backend)

Karena backend belum tersambung, seluruh data menggunakan mock:

| Data | Lokasi Mock | Siap Diganti Dengan |
|---|---|---|
| Sesi chat | `useChatLogic.ts` (state awal) | OpenAI / Gemini API response |
| Data skor sesi | `MOCK_SESSIONS` di `[session_id]/page.tsx` | `GET /assessments/{session_id}` |
| Daftar bisnis sidebar | `MOCK_SESSIONS` di `ChatDrawer.tsx` | `GET /business-profiles?user_id=` |
| Status login | `AuthContext` + `sessionStorage` | Supabase Auth (Google OAuth) |
| OCR result | `MOCK_OCR` di `OCRScanningOverlay.tsx` | Azure Document Intelligence API |

---

## 9. Dependency Kunci & Pertimbangan

| Package | Versi | Peran | Catatan |
|---|---|---|---|
| `next` | 16.2.4 | Framework utama (App Router) | Turbopack digunakan di dev |
| `react` | 19.2.4 | UI runtime | Concurrent features aktif |
| `gsap` + `@gsap/react` | 3.15+ | Semua animasi | `useGSAP` hook, bukan `useEffect` |
| `recharts` | 3.8.1 | Visualisasi radar chart | Hanya dipakai di RadarChart |
| `lucide-react` | 1.8.0 | Icon library | Konsisten di semua komponen |
| `@supabase/supabase-js` | 2.104+ | Client Supabase | Siap pakai, belum aktif |
| `@supabase/ssr` | 0.10+ | SSR helper Supabase | Dibutuhkan untuk middleware auth |

---

## 10. Aturan Pengembangan (Engineering Constraints)

1. **Tidak ada Tailwind utility class di JSX** — Semua styling via `style={{}}` inline atau CSS custom property. Tailwind hanya untuk `@import "tailwindcss"` di globals.css.
2. **Animasi wajib GSAP** — Dilarang menggunakan CSS `transition` untuk animasi masuk/keluar komponen. CSS transition hanya untuk hover sederhana.
3. **`useGSAP` bukan `useEffect`** — Semua GSAP animation harus dalam `useGSAP(() => {...}, { scope: containerRef })`, dan dependency array wajib mencantumkan semua state yang mempengaruhi animasi.
4. **Komponen stateless** — Komponen UI murni (ChatBubble, SubScoreCard, dsb.) tidak boleh punya state sendiri kecuali memang UI-local (e.g., hover).
5. **Warna tidak boleh hardcode hex** — Gunakan `var(--color-*)` tokens.
6. **TypeScript strict** — Semua props dan return types harus typed. Hindari `any` kecuali benar-benar terpaksa (saat ini ada di `MOCK_SESSIONS: Record<string, any>` yang akan diganti setelah backend ada schema definitif).

---

## 11. Kritik & Hutang Teknis (Technical Debt)

### Yang Sudah Diselesaikan ✅

- ~~Cognitive overload dashboard~~ → ScoreBreakdownBar dihapus, bobot masuk SubScoreCard
- ~~Dead-end navigation~~ → Tombol kembali sudah mengarah ke Dashboard Utama
- ~~Blank screen saat loading~~ → DashboardSkeleton + GSAP dependency array fix
- ~~Unhappy path GPS~~ → Tombol "Tolak Akses" + AI fallback ke manual
- ~~Unhappy path OCR~~ → Tombol "Batalkan Scan / Gagal" + AI fallback
- ~~Tidak ada undo chat~~ → Edit ✏️ icon pada bubble terakhir

### Hutang Teknis untuk V2 🔴

#### UX / Product

1. **Tidak ada session recovery** — Jika user tutup tab sebelum login, seluruh progress chat hilang tanpa peringatan. Solusi: `beforeunload` warning + auto-save ke `localStorage` setiap langkah.
2. **Konfirmasi data sebelum kirim** — AI saat ini langsung memproses input apapun. Idealnya ada konfirmasi: *"Anda yakin omzet Anda Rp10.000? Apakah itu per hari, per bulan?"*
3. **Aksesibilitas (a11y)** — Belum ada `aria-label`, `role`, keyboard focus trap di modal, atau screen reader support.
4. **Internasionalisasi** — Semua teks hardcoded Bahasa Indonesia. Jika diperlukan ekspansi, butuh i18n solution (next-intl).

#### Teknis

5. **Export PDF** — Tombol ada, fungsionalitasnya placeholder. Implementasi backend: generate PDF dari data sesi menggunakan Puppeteer/WeasyPrint, atau frontend-only dengan `@react-pdf/renderer`.
6. **Penomoran sesi tidak informatif** — `session-demo-001` tidak bermakna. Saat backend ada, gunakan `assessment_id` UUID dengan display name yang lebih human-readable.
7. **Variabel `MOCK_SESSIONS` duplikat** — Ada di `ChatDrawer.tsx` dan `[session_id]/page.tsx` dengan shape yang berbeda. Setelah backend, keduanya digantikan oleh satu API call, tapi saat ini perlu dijaga konsistensinya manual.
8. **`ScoreBreakdownBar.tsx` yatim piatu** — File masih ada tapi tidak dipakai. Hapus jika tidak ada rencana V2 untuk memanfaatkannya, atau dokumentasikan alasannya.
9. **Tidak ada error boundary** — Jika `RadarChart` crash (library recharts gagal render), seluruh halaman detail ikut crash. Tambahkan `<ErrorBoundary>` di sekeliling komponen visualisasi.
10. **`fix_syntax.js` tertinggal** — File debug yang tidak sengaja ter-commit ke root frontend. Hapus sebelum production.

#### Performa

11. **GSAP tidak di-cleanup dengan benar** — Beberapa `gsap.to()` dipanggil tanpa `gsap.killTweensOf()` di cleanup. Ini bisa menyebabkan memory leak setelah banyak navigasi. Gunakan `ctx.revert()` di return `useEffect`.
12. **Tidak ada React.memo / useMemo** — Komponen seperti `SubScoreCard` dan `ChatBubble` di-render ulang setiap pesan baru masuk. Untuk skala besar, perlu memoization.
13. **Image optimization** — Avatar di ChatLogin menggunakan URL eksternal `ui-avatars.com`. Saat backend tersambung, gunakan `<Image>` dari Next.js dengan domain whitelist.

---

## 12. Roadmap Integrasi Backend

Urutan yang direkomendasikan setelah frontend ini:

```
Phase 1: Auth
  └─ Ganti mock login dengan Supabase Google OAuth
  └─ Session persistence via Supabase cookie (pakai @supabase/ssr)

Phase 2: Data
  └─ Ganti MOCK_SESSIONS dengan GET /assessments/{id}
  └─ Ganti daftar bisnis sidebar dengan GET /business-profiles
  └─ Hubungkan EditProfileModal ke PATCH /business-profiles/{id}

Phase 3: Chat AI
  └─ Hubungkan useChatLogic step machine ke POST /chat/message
  └─ Response dari OpenAI/Gemini menggantikan setTimeout mock

Phase 4: Scoring
  └─ Setelah chat selesai, POST /assessments → dapat session_id asli
  └─ Redirect ke /dashboard/{session_id} dengan data nyata

Phase 5: Documents
  └─ Upload dokumen ke Supabase Storage
  └─ Panggil OCR API (Azure Document Intelligence)
  └─ Hasil OCR masuk ke scoring pipeline
```

---

## 13. Cara Menjalankan Lokal

```bash
cd frontend
npm install
cp .env.local.example .env
# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
# Akses di http://localhost:3000
```

**Route yang bisa langsung dikunjungi:**
- `/` → redirect ke `/landing`
- `/landing` → halaman marketing
- `/chat` → mulai percakapan
- `/dashboard` → overview (simulasi login terlebih dahulu via chatbot)
- `/dashboard/session-demo-001` → detail skor demo (Warung Sembako Bu Sari, 712)
- `/dashboard/session-demo-002` → detail skor demo (Toko Online Budi Jaya, 641)
- `/dashboard/session-demo-003` → detail skor demo (Jasa Ojek Pak Andi, 498)

---

*Dokumen ini dibuat untuk keperluan handover, onboarding developer baru, dan referensi saat integrasi backend.*
