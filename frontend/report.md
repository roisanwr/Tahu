# 🕵️‍♂️ Research & State Audit: TAHU Frontend UI

Sebagai *Elite Frontend Architect* Anda, saya telah melakukan audit secara menyeluruh terhadap arsitektur UI kita saat ini dibandingkan dengan kebutuhan sistem (Chat, Upload, Geo, Dashboard, Session). 

Berikut adalah riset terperinci terkait apa yang **sudah beres**, **baru setengah jalan**, dan **masih gaib (belum ada sama sekali)** di *repository* ini.

---

## 1. 💬 Chat Interface (Core Conversational UI)
**Status:** `[90% SELESAI]`

*   **Yang Sudah Ada:** Arsitektur modular berstandar industri (`ChatHeader`, `ChatInput`, `ChatBubble`, `ChatDrawer`), sistem animasi kelas atas bertenaga GSAP, dan ekosistem Hook state management (`useChatLogic.ts`).
*   **Yang Kurang (10%):** Mekanisme *Auto-resize* pada kolom pengetikan (textarea yang membesar sendiri saat teks panjang) dan transisi *smooth scrolling* saat keyboard HP muncul.

## 2. 📍 Geospatial Input UI (Peta & Lokasi)
**Status:** `[30% SELESAI - HANYA MOCKUP]`

*   **Yang Sudah Ada:** Widget *"Bagikan Lokasi Usaha"* di dalam rentetan *chat bubble* dan tombol-tombol pelatuknya.
*   **Yang Kurang Secara UI (Krusial):** 
    1.  **`<MapModalBottomSheet>`**: Saat *user* menekan tombol "Buka Peta", saat ini hanya muncul `alert()`. Kita butuh sebuah UI *Bottom Sheet* raksasa yang menyodok dari bawah layar HP berisi peta interaktif (berbasis Google Maps iframe / statik mockup) lengkap dengan *Search Bar* (Kotak Pencarian "Cari Gedung/Jalan") dan tombol konfirmasi *Pin Location*.
    2.  **Izin Lokasi Layar (Permission UI)**: Tampilan visual saat kita meminta akses "Izinkan Lokasi" agar tidak mengintimidasi *user*.

## 3. 📄 Document Upload UI (OCR Processing)
**Status:** `[30% SELESAI - HANYA MOCKUP]`

*   **Yang Sudah Ada:** Kotak *Dashed Border* (Upload Request) di dalam *chat* dan tombol Klip Kertas (Paperclip) di kiri *Input Form*.
*   **Yang Kurang Secara UI (Krusial):**
    1.  **`<CameraCaptureUX>`**: Saat *user* menekan ambil foto, harusnya ada UI pratinjau kamera web/HP atau setidaknya desain *Native File Picker* yang terhubung cantolannya.
    2.  **`<OCRScanningOverlay>`**: Setelah *user* unggah foto nota, harus ada animasi elit (seperti garis hijau naik-turun atau efek *scanning*) yang memberi isyarat bahwa AI "TAHU" sedang menganalisa tulisan di atas nota (*Feedback Processing*), sebelum bot membalas skornya. Ini sangat vital buat efek "Wih, AI-nya pinter" di mata *user*.

## 4. 📊 Dashboard & Score Card
**Status:** `[0% SELESAI - BELUM DIBANGUN MURNI]`

Halaman pamungkas tempat *User* dilempar setelah *Login* dan *Chat* selesai. Sama sekali belum ada filenya.
*   **Yang Harus Dibuat:**
    1.  **`app/dashboard/page.tsx`**: Halaman utama.
    2.  **`<CreditScoreGauge>`**: Visualisasi radial/setengah lingkaran berbentuk spidometer yang menunjukkan angka (misal: 750/1000 - Sangat Baik). HARAM pakai grafik statis membosankan, kita harus pasang GSAP SVG Animation di sini.
    3.  **`<SubScoreBreakdown>`**: Kartu-kartu kecil penyusun skor (Kekuatan Cashflow, Risiko Lokasi, Validitas Berkas).
    4.  **`<LoanRecommendationCard>`**: Bagian UI paling menguntungkan yang menampilkan *"Anda berhak mencairkan KUR Rp 50.000.000"*.

## 5. 🗄️ Session Management UI
**Status:** `[20% SELESAI]`

*   **Yang Sudah Ada:** Tombol *Login Google* dan *Landing Page*.
*   **Yang Kurang Secara UI:**
    1.  **Drawer History**: Di `ChatDrawer.tsx` sekarang cuma ada tombol "Kembali ke Beranda". Seharusnya ada daftar obrolan historis (*"Sesi Penilaian Warung Kopi - 24 April"*).
    2.  **Resume Banner**: Saat *user* buka web lagi, harus ada UI *banner* melayang: *"Lanjutkan penilaian terakhir Anda?"*

---

> [!WARNING]
> Secara arsitektur *frontend*, fondasi kita sangat kokoh. Tetapi jika produk ini di-_demo_-kan besok, kelemahan terbesarnya adalah **ketiadaan halaman Dashboard (Hasil Skor)**, dan **Modal Peta/Kamera yang mati**.

### 💡 Rekomendasi Eksekusi 
Saran saya sebagai *Architect* Anda, kita hajar pembuatan layar **Dashboard & Score Card UI** terlebih dahulu. Kenapa? Karena fitur Peta/Kamera butuh sambungan API pihak ketiga yang mungkin rumit, tapi halaman Dashboard adalah aset terbesar Anda yang bisa langsung *"memukau"* juri atau investor saat melihat hasil dari *chat bot* ini.

Silakan pelajari laporan di atas dan beri perintah. Mau merakit halaman **Dashboard** atau membikin **Modal UI untuk Maps & OCR Scanning** terlebih dulu?
