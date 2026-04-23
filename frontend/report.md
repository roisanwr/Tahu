# 🕵️‍♂️ State Audit: TAHU Frontend UI
*Diperbarui: 23 April 2026 — Post-Implementation Sprint*

Audit ini mencerminkan kondisi aktual **setelah sesi implementasi** selesai. Semua data dan koneksi backend masih bersifat mock.

---

## 1. 💬 Chat Interface (Core Conversational UI)
**Status:** `[95% SELESAI]`

*   **Yang Sudah Ada:** Arsitektur modular berstandar industri (`ChatHeader`, `ChatInput`, `ChatBubble`, `ChatDrawer`, `ChatTypingIndicator`, `ChatLogin`), sistem animasi GSAP (`back.out` easing custom), hook state management (`useChatLogic.ts`), auto-resize textarea, progress bar 6 langkah yang reaktif (menggunakan `useState` bukan `useRef` sehingga trigger re-render).
*   **Yang Baru:** `ResumeBanner` — banner floating di atas chat yang muncul setelah 800ms delay dengan GSAP entrance, menampilkan progress bar sesi terakhir dan CTA "Lanjutkan", auto-dismiss via `sessionStorage`.
*   **Yang Tersisa (5%):** Koneksi ke real backend API `/chat` untuk menggantikan mock step flow.

---

## 2. 📍 Geospatial Input UI (Peta & Lokasi)
**Status:** `[85% SELESAI]`

*   **Yang Sudah Ada:** Widget `location_request` di ChatBubble, tombol "Saat Ini" (langsung inject lokasi GPS mock), tombol "Buka Peta" sekarang trigger `MapBottomSheet` yang nyata (bukan `alert()`).
*   **Yang Baru — `<MapBottomSheet>`:** Bottom sheet GSAP slide-up dari bawah layar, berisi OpenStreetMap iframe (gratis, tanpa API key), search bar dengan autocomplete 5 lokasi mock, GPS auto-detect button, chip konfirmasi lokasi, dan tombol konfirmasi utama yang disabled sampai lokasi dipilih. `location_result` widget sekarang render mini-map OSM iframe sungguhan.
*   **Yang Tersisa (15%):** Integrasi geocoding real (Nominatim API) untuk search bar yang fungsional.

---

## 3. 📄 Document Upload UI (OCR Processing)
**Status:** `[80% SELESAI]`

*   **Yang Sudah Ada:** Upload widget di ChatBubble (`upload_request`), Paperclip button di ChatInput.
*   **Yang Baru:** Paperclip button sekarang trigger `<input type="file" accept="image/*,.pdf">` yang tersembunyi (native file picker sungguhan). Upload widget ChatBubble dispatch custom event `tahu:trigger-file-upload` sehingga kedua entry point terhubung. `<OCRScanningOverlay>` muncul inline di atas ChatInput setelah file dipilih — menampilkan animasi garis scan GSAP (naik-turun hijau), progress 4 tahap (Memindai → Membaca → Mengekstrak → Selesai), dan setelah 3.1 detik otomatis menginjeksikan hasil mock OCR ke chat. `image_result` bubble kini memiliki footer "Dokumen diterima" dengan ikon verifikasi.
*   **Yang Tersisa (20%):** Koneksi ke real endpoint `POST /upload-document` (Azure OCR).

---

## 4. 📊 Dashboard Preview (`/dashboard`)
**Status:** `[90% SELESAI]`

*   **Yang Sudah Ada & Diperbarui:** Menampilkan `CreditGauge` GSAP, `RiskBadge` dengan pulsing dot, 4 `SubScoreCard` (sekarang menampilkan angka numerik 0–100), `LoanBanner` gradient, dan CTA teaser "Radar Chart & Analisis AI tersedia" yang link ke halaman laporan lengkap.
*   **Yang Tersisa (10%):** Koneksi ke data sesi real pengguna (bukan mock hardcode).

---

## 5. 📊 Dashboard Laporan Lengkap (`/dashboard/[session_id]`)
**Status:** `[90% SELESAI — DIBANGUN DARI NOL]`

Halaman ini sebelumnya 100% placeholder ("Day 7"). Sekarang sudah lengkap:

1.  **Top Bar** — Nama UMKM, `RiskBadge`, session ID, tanggal, tombol "Ekspor PDF".
2.  **`<CreditGauge>`** — SVG half-circle dengan animasi `strokeDashoffset` GSAP + counter angka.
3.  **5 `<SubScoreCard>`** — Finansial, Pengalaman, Lokasi, Dokumen, Karakter — masing-masing dengan nilai teks + angka numerik.
4.  **`<ScoreBreakdownBar>`** — 5 progress bar horizontal dengan GSAP `width` animation bertahap, label, bobot, dan warna per dimensi.
5.  **`<RadarChart>`** — Spider chart Recharts 5 dimensi dengan custom tooltip, warna brand, dan filled area.
6.  **`<AIExplanationCard>`** — Typewriter effect 18ms/karakter dengan kursor berkedip, GSAP entrance animation.
7.  **`<LoanBanner>`** — Banner hijau gradient dengan CTA "Ajukan Pencairan Sekarang".

*   **Yang Tersisa (10%):** Koneksi ke `GET /assessments/{assessment_id}` untuk data real.

---

## 6. 🗄️ Session Management UI
**Status:** `[70% SELESAI]`

*   **Yang Sudah Ada & Diperbarui:**
    - `ChatDrawer` sekarang menampilkan 3 sesi historis mock lengkap dengan nama UMKM, skor numerik, label risiko berwarna, dan tanggal. Setiap item adalah link ke `/dashboard/[session_id]`.
    - `ResumeBanner` tampil di `/chat` dengan sesi terakhir, progress bar 40%, dan CTA "Lanjutkan".
    - `useChatLogic` sekarang routing ke `/dashboard/session-demo-001` (bukan `/dashboard` generik).
*   **Yang Tersisa (30%):** Koneksi ke Supabase untuk history sesi real + autentikasi Google OAuth sungguhan.

---

> [!NOTE]
> **Arsitektur frontend sudah production-ready secara struktur.** Semua komponen mengikuti anti-pattern checklist dari `rulesui.md`: tinted neutrals (bukan pure gray), custom easing `cubic-bezier(0.16, 1, 0.3, 1)`, font Plus Jakarta Sans, tidak ada cards-in-cards redundan, motion purposeful dan staggered.

### 📦 Inventaris Komponen Lengkap

| Komponen | Path | Status |
|---|---|---|
| `ChatHeader` | `components/chat/ChatHeader.tsx` | ✅ Final |
| `ChatInput` | `components/chat/ChatInput.tsx` | ✅ Real file picker + OCR |
| `ChatBubble` | `components/chat/ChatBubble.tsx` | ✅ MapSheet + real upload |
| `ChatDrawer` | `components/chat/ChatDrawer.tsx` | ✅ Session history |
| `ChatTypingIndicator` | `components/chat/ChatTypingIndicator.tsx` | ✅ Final |
| `ChatLogin` | `components/chat/ChatLogin.tsx` | ✅ Final |
| `MapBottomSheet` | `components/chat/MapBottomSheet.tsx` | 🆕 OSM iframe + search |
| `OCRScanningOverlay` | `components/chat/OCRScanningOverlay.tsx` | 🆕 4-stage GSAP scanner |
| `ResumeBanner` | `components/chat/ResumeBanner.tsx` | 🆕 GSAP entrance |
| `CreditGauge` | `components/dashboard/CreditGauge.tsx` | ✅ Final |
| `DashboardHeader` | `components/dashboard/DashboardHeader.tsx` | ✅ Final |
| `SubScoreCard` | `components/dashboard/SubScoreCard.tsx` | ✅ + numeric score |
| `LoanBanner` | `components/dashboard/LoanBanner.tsx` | ✅ Final |
| `RiskBadge` | `components/dashboard/RiskBadge.tsx` | 🆕 5-level pulsing dot |
| `RadarChart` | `components/dashboard/RadarChart.tsx` | 🆕 Recharts spider chart |
| `ScoreBreakdownBar` | `components/dashboard/ScoreBreakdownBar.tsx` | 🆕 GSAP progress bars |
| `AIExplanationCard` | `components/dashboard/AIExplanationCard.tsx` | 🆕 Typewriter GSAP |
| `useChatLogic` | `hooks/useChatLogic.ts` | ✅ Reaktif + routing fix |

### ⏭️ Next Steps (Backend Integration)
1. Sambungkan `POST /chat` → gantikan mock step flow di `useChatLogic`
2. Sambungkan `POST /upload-document` → gantikan mock OCR result di `OCRScanningOverlay`
3. Sambungkan `POST /geoscore` → gantikan mock location di `MapBottomSheet`
4. Sambungkan `POST /calculate-score` + `GET /assessments/:id` → gantikan mock data di `/dashboard/[session_id]`
5. Implementasi Google OAuth → gantikan `handleGoogleLogin` mock di `ChatLogin`
