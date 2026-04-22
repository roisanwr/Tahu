
---

# 🏗️ BUSINESS FLOW LENGKAP — UMKM Credit Scoring Platform

---

## 📥 BAGIAN 1: INPUT DARI UMKM

### 1A. Data Identitas & Profil Usaha
| Data | Cara Input | Catatan |
|---|---|---|
| Nama pemilik & NIK | Form manual | Bisa divalidasi ke Dukcapil API (jika tersedia) |
| Nama usaha & alamat | Form manual + Google Maps autocomplete | |
| Kategori usaha (kuliner, fashion, jasa, dll) | Dropdown | |
| Lama berdiri usaha | Form manual | |
| Jumlah karyawan | Form manual | |
| Foto tempat usaha | Upload gambar | Diproses AI untuk verifikasi |
| Video pitching usaha pendek | Upload video / rekam langsung | Diproses AI analisis kepercayaan |

### 1B. Data Keuangan Informal
| Data | Cara Input | Catatan |
|---|---|---|
| Estimasi omzet per bulan | Slider / input angka | Self-reported |
| Estimasi pengeluaran operasional | Input angka | |
| Frekuensi transaksi harian/mingguan | Input angka | |
| Upload foto nota / struk transaksi | Upload gambar | OCR ekstrak angka otomatis |
| Upload buku kas manual (foto) | Upload gambar | OCR + AI parsing |
| Screenshot rekening koran (informal) | Upload gambar | OCR parsing |
| Riwayat pinjaman sebelumnya (jika ada) | Form manual | |
| Aset yang dimiliki (motor, mesin, dll) | Checklist + estimasi nilai | |

### 1C. Data Digital & Marketplace
| Data | Cara Input | Catatan |
|---|---|---|
| Link toko Tokopedia / Shopee / Lazada | Input URL | Scraping publik atau API resmi |
| Screenshot dashboard penjualan marketplace | Upload gambar | OCR + AI parsing angka |
| Jumlah rating & ulasan toko | Auto-fetch dari link atau input manual | |
| Data QRIS / transaksi GoPay, OVO, Dana | Connect OAuth atau upload mutasi | Fintech open banking |
| Follower & engagement media sosial (IG, TikTok) | Input URL atau connect API | Proxy reputasi brand |
| Jumlah konten produk yang diposting | Auto-fetch dari sosmed | |
| WhatsApp Business verified | Checklist (ya/tidak) | Sinyal formalitas usaha |

### 1D. Data Psikometrik & Perilaku
| Data | Cara Input | Catatan |
|---|---|---|
| Kuesioner psikometrik (30-50 pertanyaan) | Form in-app | Mengukur risk appetite, kejujuran, disiplin finansial |
| Pola jawaban (waktu per soal, perubahan jawaban) | Otomatis dicatat sistem | Behavioral signal |
| Permainan keputusan finansial sederhana (gamifikasi) | Mini game in-app | Proxy pengambilan keputusan |
| Skor literasi keuangan (kuis) | Kuis in-app | |

### 1E. Data Sosial & Komunitas
| Data | Cara Input | Catatan |
|---|---|---|
| Referensi dari sesama UMKM / komunitas | Input nama + nomor | Social trust scoring |
| Keanggotaan koperasi / asosiasi usaha | Checklist + upload kartu | |
| Testimoni pelanggan langsung | Form yang dishare ke pelanggan | |
| Partisipasi pelatihan / sertifikasi (Prakerja, dll) | Upload sertifikat | OCR verifikasi |

### 1F. Data Lingkungan & Geospasial
| Data | Cara Input | Catatan |
|---|---|---|
| Lokasi usaha (koordinat GPS) | Auto-detect atau pin di peta | |
| Kepadatan area bisnis di sekitar lokasi | Otomatis dari data geospasial | Proxy potensi pasar |
| Akses ke infrastruktur (jalan, pasar, bank terdekat) | Otomatis dari peta | |
| Indeks ekonomi daerah | Otomatis dari dataset publik BPS | |

---

## ⚙️ BAGIAN 2: PROSES DI DALAM APLIKASI

### 2A. Data Ingestion & Preprocessing
```
Raw input masuk
    ↓
Validasi format & completeness check
    ↓
OCR Engine → ekstrak teks/angka dari gambar
    ↓
Data cleaning & normalization
    ↓
Feature engineering (transformasi data mentah → variabel model)
    ↓
Masuk ke scoring pipeline
```

### 2B. Multi-Layer Scoring Engine

**Layer 1 — Verifikasi & Fraud Detection**
- Deteksi dokumen palsu / manipulasi foto
- Cross-check konsistensi data (omzet vs frekuensi transaksi)
- Deteksi anomali perilaku pengisian form
- Face liveness check (selfie vs KTP)

**Layer 2 — Alternative Credit Scoring**
- Model ML utama (XGBoost / LightGBM / Neural Net)
- Input: semua fitur yang sudah di-engineer
- Output: skor numerik 300–850 (mirip SLIK OJK tapi alternatif)
- Sub-skor per dimensi:
  - Skor Reputasi Digital
  - Skor Kapasitas Keuangan
  - Skor Karakter (psikometrik)
  - Skor Konteks Lingkungan
  - Skor Konsistensi Data

**Layer 3 — Sentiment & Reputation Analysis**
- Analisis ulasan toko di marketplace (NLP)
- Analisis komentar sosial media
- Output: sentiment score + reputasi brand

**Layer 4 — AI Explainability**
- SHAP values → faktor apa yang naikkan/turunkan skor
- Generate narasi otomatis penjelasan skor dalam bahasa Indonesia
- Rekomendasi actionable untuk meningkatkan skor

**Layer 5 — Risk Segmentation**
- Klasifikasi: Very Low / Low / Medium / High / Very High Risk
- Prediksi probabilitas gagal bayar
- Rekomendasi produk pinjaman yang sesuai (jumlah, tenor, bunga)

### 2C. Fitur Tambahan dalam Platform

**Monitoring & Update Skor**
- Skor diperbarui otomatis setiap bulan
- Notifikasi jika ada perubahan signifikan
- Tracking progress peningkatan skor

**Simulasi Pinjaman**
- UMKM bisa input "mau pinjam berapa" → AI prediksi kemungkinan disetujui
- Simulasi cicilan

**Credit Journey / Roadmap**
- AI generate roadmap personal: "Lakukan ini dalam 3 bulan untuk naik ke tier berikutnya"
- Milestone & gamifikasi pencapaian

**Document Generator**
- AI bantu UMKM buat proposal pinjaman otomatis dari data yang sudah ada
- Generate laporan keuangan sederhana dari data informal

---

## 📤 BAGIAN 3: OUTPUT

### 3A. Output untuk UMKM
| Output | Format | Deskripsi |
|---|---|---|
| Credit Score Card | Visual dashboard | Skor + breakdown per dimensi |
| Laporan Profil Kredit | PDF downloadable | Dokumen formal yang bisa dibawa ke lender |
| Rekomendasi Produk Pinjaman | Card list | Cocok berdasarkan profil risiko |
| Roadmap Peningkatan Skor | Step-by-step guide | Personalisasi per UMKM |
| Sertifikat Digital | PDF/badge | Bukti sudah terverifikasi platform |
| Chatbot Konsultasi | Chat interface | Tanya jawab seputar keuangan & skor |

### 3B. Output untuk Lender (Bank/Koperasi/Fintech)
| Output | Format | Deskripsi |
|---|---|---|
| Dashboard Portofolio UMKM | Web dashboard | List UMKM terverifikasi + filter risiko |
| Credit Report per UMKM | PDF/API | Detail lengkap profil kredit |
| Risk Heatmap | Peta visual | Sebaran UMKM per risiko per wilayah |
| Analitik Agregat | Chart & grafik | Tren, distribusi sektor, dll |
| API Integration | REST API | Lender bisa pull data ke sistem mereka |
| Alert System | Notifikasi | Jika skor UMKM berubah signifikan |

### 3C. Output untuk Admin/Regulator *(opsional)*
- Laporan agregat nasional
- Dashboard monitoring ekosistem
- Deteksi pola fraud lintas UMKM

---

## 🏦 BAGIAN 4: FLOW SISI INVESTOR / BANK / FINTECH

```
Lender daftar & verifikasi institusi
        ↓
Akses dashboard lender
        ↓
┌─────────────────────────────────────┐
│  BROWSE & FILTER UMKM               │
│  • Filter by: sektor, lokasi,       │
│    skor minimum, jumlah pinjaman    │
│    yang dibutuhkan, tenor           │
│  • Sorting: skor tertinggi,         │
│    terbaru, paling sering dilihat   │
└─────────────────────────────────────┘
        ↓
Lihat profil UMKM (summary atau full report)
        ↓
        ├── Tertarik → Kirim penawaran ke UMKM
        │              (notif ke UMKM)
        │
        └── Tidak tertarik → Lanjut browse
        ↓
UMKM terima penawaran → Negosiasi in-app
        ↓
Deal → Proses ke sistem lender (offline atau API)
        ↓
Post-disbursement monitoring:
• Update skor UMKM secara berkala
• Alert jika ada perubahan perilaku
• Laporan repayment (jika UMKM input)
```

### Fitur Tambahan untuk Lender
- **Portfolio Risk Analytics** — analisis risiko keseluruhan portofolio pinjaman
- **Benchmarking** — bandingkan portofolio mereka vs rata-rata industri
- **Custom Scoring Weight** — lender bisa atur bobot dimensi sesuai kebijakan kredit mereka
- **Watchlist** — simpan UMKM favorit, dapat notif jika skor berubah
- **Bulk Assessment** — upload list UMKM, platform assess sekaligus via API

---

## 🤖 BAGIAN 5: AI YANG DIBUTUHKAN — FULL BREAKDOWN

### 5A. Microsoft AI (Gratis / Free Tier) ✅

| AI | Layanan Azure | Fungsi | Status |
|---|---|---|---|
| **OCR / Document Reading** | Azure AI Document Intelligence (free tier: 500 hal/bulan) | Ekstrak data dari foto nota, buku kas, KTP | Siap pakai via API |
| **Sentiment Analysis** | Azure AI Language (free tier: 5000 transaksi/bulan) | Analisis ulasan marketplace & sosmed | Siap pakai via API |
| **Named Entity Recognition** | Azure AI Language | Ekstrak entitas dari teks ulasan (produk, lokasi, dll) | Siap pakai via API |
| **Text Translation** | Azure AI Translator (free tier: 2jt karakter/bulan) | Jika ulasan dalam bahasa daerah/Inggris | Siap pakai via API |
| **Face Verification / Liveness** | Azure AI Face (free tier: 30k transaksi/bulan) | Verifikasi selfie vs KTP, liveness check | Siap pakai via API |
| **Custom Vision** | Azure AI Custom Vision (free tier tersedia) | Klasifikasi foto tempat usaha (layak/tidak layak) | Perlu training dengan dataset foto |
| **Speech to Text** | Azure AI Speech (free tier: 5 jam/bulan) | Jika ada fitur voice input dari UMKM | Siap pakai via API |
| **Anomaly Detector** | Azure AI Anomaly Detector (free tier tersedia) | Deteksi pola transaksi yang anomali / mencurigakan | Siap pakai via API |
| **Language Understanding** | Azure AI Language (CLU) | Chatbot intent recognition | Perlu training intent |

### 5B. Model ML Custom (Perlu Di-train) 🔧

| Model | Algoritma Rekomendasi | Data Training | Sumber Dataset |
|---|---|---|---|
| **Core Credit Scoring** | XGBoost / LightGBM / TabNet | Data historis kredit UMKM | World Bank SME Finance dataset, BPS, atau synthetic data |
| **Fraud Detection** | Isolation Forest + Neural Net | Data transaksi anomali | Synthetic + augmented |
| **Psychometric Scoring** | Logistic Regression / SVM | Hasil kuesioner + label repayment | Bisa pakai riset akademis publik |
| **Document Authenticity** | CNN (ResNet/EfficientNet) | Foto dokumen asli vs palsu | Perlu kumpulkan sendiri atau pakai augmentasi |
| **Business Category Classifier** | BERT fine-tuned / FastText | Deskripsi usaha UMKM | Bisa pakai data publik Tokopedia/BPS |

### 5C. Model / API dari Luar Microsoft 🌐

| AI | Sumber | Fungsi | Catatan |
|---|---|---|---|
| **LLM untuk chatbot & narasi** | Llama 3 / Mistral (open source) | Generate penjelasan skor, roadmap, proposal | Gratis, deploy sendiri, tidak terlindungi hak cipta |
| **LLM alternatif** | Gemini API (free tier) | Backup LLM | Free tier tersedia |
| **Sentence Embedding** | all-MiniLM (HuggingFace) | Similarity analysis ulasan | Open source, gratis |
| **Indonesian NLP** | IndoBERT (HuggingFace) | Analisis teks bahasa Indonesia | Open source UI |
| **Geospatial Analysis** | OpenStreetMap + Python (OSMnx) | Analisis lokasi usaha | Open data |
| **Marketplace Scraping** | BeautifulSoup / Playwright | Ambil data publik toko online | Data publik, bukan data terlindungi |

### 5D. Dataset yang Bisa Dipakai (Non-Copyright) ✅

| Dataset | Sumber | Kegunaan |
|---|---|---|
| Data UMKM Indonesia | BPS.go.id | Konteks & benchmark |
| SME Credit Risk Dataset | World Bank Open Data | Training scoring model |
| Indonesian Sentiment Dataset | IndoNLP (HuggingFace) | Training sentiment analysis bahasa Indonesia |
| Synthetic Financial Data | Generate sendiri via Python (Faker, SDV) | Augmentasi training data |
| Geospasial Indonesia | Ina-Geoportal (BIG) | Analisis lokasi |
| Prakerja Dataset Publik | Data.go.id | Verifikasi sertifikasi |

---

## 🗺️ SUMMARY VISUAL FLOW

```
UMKM
  │
  ├─ Input Data ──────────────────────────────────────────┐
  │   • Profil & Identitas                                 │
  │   • Foto/Dokumen (OCR Azure)                           │
  │   • Link Marketplace (scraping)                        │
  │   • Sosial Media (API)                                 │
  │   • Kuesioner Psikometrik                              │
  │   • Geolokasi                                          │
  │                                                        ▼
  │                                              [Azure Document Intelligence]
  │                                              [Azure AI Language]
  │                                              [Azure Face API]
  │                                              [Custom ML Model]
  │                                              [IndoBERT / LLM]
  │                                                        │
  │                                              ┌─────────▼──────────┐
  │                                              │   SCORING ENGINE   │
  │                                              │  Multi-layer AI    │
  │                                              │  • Fraud check     │
  │                                              │  • Credit score    │
  │                                              │  • Sentiment       │
  │                                              │  • Explainability  │
  │                                              └─────────┬──────────┘
  │                                                        │
  ├─ Output UMKM ◄─────────────────────────────────────────┤
  │   • Score Card                                         │
  │   • Roadmap                                            │
  │   • Rekomendasi Pinjaman                               │
  │   • Chatbot Konsultasi                                 │
  │                                                        │
LENDER ◄────────────────────────────────────────────────────┘
  │
  ├─ Dashboard Lender
  ├─ Filter & Browse UMKM
  ├─ Risk Analytics
  └─ API Integration
```

---
