Ini pertanyaan strategis yang paling penting bro. Dan jawabannya butuh kejujuran penuh — bukan jawaban yang enak didengar, tapi yang benar. Mari kita bedah dulu sebelum ambil keputusan.Oke bro, sekarang aku punya semua yang dibutuhkan buat ngambil keputusan yang paling tepat. Ini bukan soal mana yang "keren" — ini soal mana yang **paling jujur dan paling tepat sasaran**.

---

# 🎯 Keputusan Strategis:Persempit Scope?

Sebelum jawab, aku mau kamu lihat **akar masalah yang sesungguhnya** dulu.

---

## Masalah Sebenarnya Bukan di Formula-nya

Setelah aku baca ulang semua dokumen kamu secara menyeluruh, ini temuannya yang bikin aku harus jujur:

> **V3 itu tidak rusak. V3 itu hanya sedang mencoba melakukan hal yang mustahil — menilai semua jenis bisnis dengan satu formula yang sama.**

Ini ibarat kamu pakai satu alat ukur untuk ngukur panjang, berat, dan suhu sekaligus. Alatnya tidak salah — tapi penggunaannya tidak tepat.

---

## Framework Berpikir: 3 Pilihan yang Ada

```
PILIHAN A — Tetap V3
Tidak ada perubahan. Terima kelemahannya.

PILIHAN B — Buat V4
Rebuild dari nol dengan arsitektur baru.

PILIHAN C — Persempit Scope V3
Tetap pakai V3, tapi batasi siapa yang boleh dinilai.
```

Mari kita bedah satu per satu secara jujur.

---

## Pilihan A — Tetap V3 Apa Adanya

### Apa artinya ini?
Kamu terima bahwa V3 punya blind spot dan tetap jalankan apa adanya.

### Kapan ini masuk akal?
Kalau tujuannya murni **demo/prototype** untuk membuktikan konsep ke investor atau juri kompetisi. Tidak ada yang menilai edge cases di demo.

### Masalahnya?
Kalau skorinaja dipakai untuk penilaian nyata — bahkan pilot terbatas sekalipun — kamu berpotensi **salah menilai** bisnis nyata. Warung Bu Sari yang udah 8 skorinajan bisa dapat skor lebih rendah dari seller marketplace yang baru 6 bulan cuma karena Bu Sari tidak digital. Ini bukan hanya masalah teknis, ini masalah **keadilan**.

**Verdict:** ✅ Oke untuk pure demo. ❌ Tidak oke untuk penilaian nyata.

---

## Pilihan B — Buat V4 dari Nol

### Apa artinya ini?
Redesign total arsitektur scoring dengan business-type-aware model. Setiap tipe bisnis punya formula sendiri.

### Seperti apa V4 itu?
Kira-kira begini arsitekturnya:

```
USER MASUK → CHATBOT TANYA DULU:
"Usaha kamu masuk kategori apa?"

          ↓
    CLASSIFIER ENGINE
    (tentukan business type)

    ┌─────────────────────────────────┐
    │  Type 1: Retail/Dagang Reguler  │→ Pakai formula V3 (sudah bagus)
    │  Type 2: Grosir/Distributor     │→ Formula volume-based
    │  Type 3: Jasa/Project-based     │→ Formula annualized + invoice
    │  Type 4: Musiman/Agribisnis     │→ Formula seasonal adjustment
    │  Type 5: Digital/Marketplace    │→ Formula platform-data-heavy
    │  Type 6: Kreator/Freelancer     │→ Formula income-stream-based
    └─────────────────────────────────┘
          ↓
    SCORING PER TYPE
    (bobot berbeda, formula berbeda)
          ↓
    NORMALISASI KE 300–850
    (skala sama, tapi cara hitungnya beda)
```

### Masalah V4?
**Terlalu ambisius untuk sekarang.** Kamu butuh:
- Data historis per business type untuk validasi bobot
- Formula terpisah per kategori yang harus di-riset dan di-test
- Chatbot yang lebih pintar untuk klasifikasi bisnis
- Waktu development yang jauh lebih lama
- Testing yang jauh lebih kompleks

Dan yang paling krusial: **kamu belum punya data untuk membuktikan bobot V4 lebih baik dari V3.** Kamu hanya akan mengganti satu set "tebakan terdidik" dengan set tebakan lain yang lebih kompleks.

**Verdict:** 💡 Ini adalah visi yang benar untuk jangka panjang. ❌ Terlalu prematur untuk sekarang.

---

## Pilihan C — Persempit Scope V3 ✅

### Apa artinya ini?
Kamu **tidak mengubah formula V3**, tapi kamu **secara eksplisit mendefinisikan** bisnis apa yang V3 bisa nilai dengan adil, dan bisnis apa yang **di luar jangkauan** V3 saat ini.

### Kenapa ini yang paling masuk akal?

Karena kalau kamu perhatikan dokumen PENDAHULUAN.md kamu sendiri, di bagian scope MVP tidak pernah disebutkan bahwa skorinaja harus bisa menilai **semua jenis bisnis UMKM Indonesia.** Scope-nya adalah:

> *"Membangun prototype platform kredit scoring berbasis AI yang mampu menilai kelayakan kredit pelaku UMKM melalui antarmuka percakapan yang intuitif."*

Ini adalah prototype. Dan prototype yang baik adalah prototype yang **skorinaja batasannya sendiri.**

---

## Rekomendasi Akhir: Pilihan C dengan Fondasi V4

Ini konkretnya yang aku rekomendasikan:

### Langkah 1 — Definisikan "Zona Aman" V3

Secara eksplisit nyatakan di dokumentasi dan di UI bahwa V3 dirancang untuk:

```
✅ BISNIS YANG BISA DINILAI DENGAN BAIK OLEH V3:
├── Retail dagang (warung, toko, minimarket)
├── Kuliner/F&B dengan pendapatan rutin
├── Jasa dengan pendapatan bulanan stabil (salon, laundry, bengkel ringan)
├── Seller marketplace semi-aktif (ada toko fisik juga)
└── UMKM dengan minimal 1 dokumen keuangan (struk/nota/rekening)

⚠️ BISNIS YANG HASILNYA PERLU INTERPRETASI HATI-HATI:
├── Grosir/distributor (margin tipis, volume tinggi)
├── Bisnis musiman (catering event, toko hampers lebaran)
└── Seller marketplace murni tanpa toko fisik

❌ BISNIS DI LUAR SCOPE V3 SAAT INI:
├── Kontraktor/project-based (invoice cycle)
├── Petani/agribisnis musiman
├── Freelancer/content creator/gig worker
└── Bisnis skala enterprise (omzet >500jt/bulan)
```

### Langkah 2 — Tambahkan "Early Warning" di Chatbot

Sebelum scoring dimulai, chatbot tanya dulu:

```
"Sebelum kita mulai, boleh ceritakan dulu 
usaha kamu seperti apa — apakah pendapatannya 
rutin setiap bulan, atau tergantung proyek/musim?"

Kalau jawaban = proyek/musiman →
Chatbot bilang: "Sistem kami saat ini paling optimal 
untuk bisnis dengan pendapatan rutin bulanan. 
Hasil skor kamu mungkin tidak sepenuhnya 
merepresentasikan kondisi bisnis kamu — 
tapi kita tetap bisa lanjutkan ya."
```

Ini **jujur ke user** tanpa menolak mereka.

### Langkah 3 — Perbaiki 2 Hal Kecil di V3 yang Paling Impactful

Tidak perlu rebuild total. Dua perbaikan ini saja sudah significantly mengurangi ketidakadilan:

**Perbaikan 1 — Industry-Aware Margin Normalization**

```
SEBELUMNYA (V3 sekarang):
profit_ratio 5% → selalu dapat skor rendah

SESUDAHNYA (V3.1):
profit_ratio dinilai relatif terhadap kategori:
- Grosir: 5% margin = BAGUS (benchmark industri 3-7%)
- Retail: 5% margin = BURUK (benchmark industri 20-40%)
- Jasa: 5% margin = SANGAT BURUK (benchmark industri 40-70%)

Caranya: tambahkan tabel benchmark margin per kategori usaha
```

**Perbaikan 2 — Offline Business Fairness Flag**

```
SEBELUMNYA (V3 sekarang):
Tidak ada dokumen digital = multiplier rendah langsung

SESUDAHNYA (V3.1):
Tambahkan "offline business mode":
Kalau user pilih "bisnis offline/cash-based" →
  - Baseline multiplier tidak dihukum karena tidak ada QRIS
  - Ganti digital evidence dengan physical evidence
    (foto buku kas, struk fisik, surat keterangan RT/RW)
  - Confidence multiplier floor lebih tinggi untuk kategori ini
```

### Langkah 4 — Dokumentasikan Ini Sebagai "V3.1 + Roadmap V4"

Naming yang aku sarankan:

```
V3.0 (sekarang)    → Yang ada sekarang, tidak diubah
V3.1 (jangka pendek) → 2 perbaikan di atas, scope dipersempit & didefinisikan
V4.0 (jangka panjang) → Business-type-aware scoring dengan ML clustering
```

Ini juga **story yang bagus untuk investor atau juri:**
> *"Kami skorinaja V3 punya limitasi. Kami sudah identifikasi apa saja limitasinya, kami dokumentasikan dengan jujur, dan ini roadmap kami menuju V4 yang berbasis ML."*

---

## Ringkasan Keputusan dalam Satu Tabel

| Opsi | Effort | Risiko | Cocok Untuk |
|---|---|---|---|
| **Tetap V3** | Nol | Tinggi kalau dipakai nyata | Pure demo saja |
| **Buat V4** | Sangat Tinggi | Tinggi tanpa data historis | 1–2 skorinajan ke depan |
| **Persempit V3 → V3.1** ✅ | Rendah-Sedang | Rendah | Sekarang, pilot nyata |

---

Jadi bro, **jawabannya adalah Pilihan C** — persempit scope V3, tambahkan dua perbaikan kecil yang impactful, dokumentasikan limitasinya secara jujur, dan jadikan V4 sebagai visi yang kamu perjuangkan dengan riset dan data.

Mau kita mulai dari mana dulu — desain tabel benchmark margin per industri untuk perbaikan pertama, atau buat framework "offline business mode" untuk perbaikan kedua?



Oke bro, biar aku tarik dulu semua detail formula V3 yang lengkap supaya perhitungannya akurat.Oke bro, aku udah punya semua formula lengkap dari V3. Sekarang aku akan buat simulasi yang benar-benar detail dan bisa kamu jadikan referensi implementasi backend. Mari kita mulai.

---

# 🧮 Simulasi Lengkap Scoring V3 — 3 Profil Pengusaha

> **Catatan penting:** Semua skenario ini pakai **Advanced Mode** agar kalkulasinya paling lengkap dan terperinci. Formula yang dipakai adalah **SCORING_ENGINE_SPEC_V3** (bukan V0).

Sebelum masuk ke skenario, ini dulu peta besar formula V3:

```
PIPELINE BACKEND:
Input Data
    ↓
Hitung 5 Sub-Skor (masing-masing 0–100)
    ↓
Hitung Confidence Multiplier per Pilar (0.50–1.00)
    ↓
Adjusted Score = Sub-Skor × Multiplier
    ↓
Raw Score = Σ(Adjusted Score × Bobot Pilar)
    ↓
Final Score = clamp(300 + Raw_Score × 5.50, 300, 850)
    ↓
Cek Hard Block & Soft Cap
    ↓
Output: Skor Final + Risk Level + Rekomendasi Pinjaman
```

**Bobot 5 Pilar V3:**
| Pilar | Bobot |
|---|---|
| S_financial | 40% |
| S_collateral | 25% |
| S_experience | 15% |
| S_location | 10% |
| S_character | 10% |

---

---

# 👑 SKENARIO 1 — Pengusaha Potensial (High-Tier)

## Profil: Bu Dewi — Toko Sembako + Catering Rumahan

> Bu Dewi, 38 skorinajan. Punya toko sembako di ruko sendiri sekaligus menerima pesanan catering. Sudah berjalan 7 skorinajan, 4 karyawan, pakai QRIS, punya rekening koran BCA, foto toko bagus, lokasi di pinggir jalan utama dekat pasar.

---

### 📥 DATA INPUT

```
KEUANGAN:
├── monthly_revenue      = Rp 65.000.000
├── monthly_expense      = Rp 42.000.000 (COGS + OPEX)
├── profit_ratio         = (65jt - 42jt) / 65jt = 0.354 (35.4%)
├── tx_frequency         = 200 transaksi/bulan
├── consistency_penalty  = 0 (pendapatan stabil 6 bulan terakhir)
├── qris_monthly_volume  = Rp 28.000.000
└── has_multiple_docs    = true (rekening koran + nota)

ASET / COLLATERAL:
├── asset_value          = Rp 350.000.000 (ruko + peralatan)
├── loan_outstanding     = Rp 50.000.000
├── asset_coverage_ratio = 350jt / 50jt = 7.0
├── has_fixed_location   = true
├── photo_verified       = true
└── photo_condition_score= 85 (toko bersih, tertata)

PENGALAMAN:
├── years_operating      = 7 skorinajan
├── employee_count       = 4 orang
├── has_whatsapp_biz     = true
├── loan_history_count   = 2 pinjaman
└── loan_prev_status     = 'lunas' semua

LOKASI:
├── market_distance_km   = 0.3 km
├── business_density_500m= 25 bisnis
├── has_road_access      = true (jalan utama)
└── has_bank_nearby      = true (BCA 500m)

KARAKTER:
├── marketplace_rating   = tidak ada (bukan seller online)
├── sentiment_score      = 0.75 (sangat kooperatif, antusias)
├── completeness_pct     = 95%
└── contradiction_count  = 0
```

---

### ⚙️ PERHITUNGAN SUB-SKOR

---

#### 💰 S_financial — Target: F1×0.50 + F2×0.30 + F3×0.20

**F1 — Profitability:**
```
profit_ratio = 0.354 → masuk bracket ≥0.30 → base = 50 poin
revenue = 65jt → masuk bracket ≥50jt → rev_bonus = 30 poin
has_multiple_docs = true → doc_bonus = 20 poin

F1 = min(50 + 30 + 20, 100) = 100
```

**F2 — Volume & Consistency:**
```
tx_frequency = 200/bulan → sangat tinggi → score = 30 poin
consistency_penalty = 0 (tidak ada) → full consistency = 30 poin
revenue trend = stabil → trend_bonus = 20 poin

F2 = min(30 + 30 + 20, 100) = 80
```

**F3 — Digital Cashflow (Advanced Mode aktif):**
```
qris_volume = 28jt dari total 65jt = 43% transaksi digital
→ digital ratio ≥30% → digital_score = 80
e_wallet_linked = true → bonus = 10

F3 = min(80 + 10, 100) = 90
```

**S_financial final:**
```
S_financial = (F1×0.50) + (F2×0.30) + (F3×0.20)
            = (100×0.50) + (80×0.30) + (90×0.20)
            = 50 + 24 + 18
            = 92
```

---

#### 🏠 S_collateral — Target: C1×0.70 + C2×0.30

**C1 — Asset Coverage Ratio:**
```
asset_coverage_ratio = 7.0
→ dengan depreciation factor 0.8 dan liquidation factor 0.7:
  effective_coverage = 7.0 × 0.8 × 0.7 = 3.92

Bracket: ≥3.0 → C1 = 90
```

**C2 — Fixed Location & Condition:**
```
has_fixed_location = true → +40 poin
photo_verified     = true → +30 poin
photo_condition_score = 85 → +20 poin (skala 100 → 85% × 20 = 17)

C2 = min(40 + 30 + 17, 100) = 87
```

**S_collateral final:**
```
S_collateral = (C1×0.70) + (C2×0.30)
             = (90×0.70) + (87×0.30)
             = 63 + 26.1
             = 89.1 → dibulatkan 89
```

---

#### 📅 S_experience — Target: E1×0.40 + E2×0.30 + E3×0.30

**E1 — Lama Usaha:**
```
years_operating = 7 skorinajan
→ bracket ≥5 skorinajan → piecewise linear: 40 + bonus proporsional
  = 40 + ((7-5)/5 × 10) = 40 + 4 = 44 → cap 45
E1 = 44
```

**E2 — Karyawan & Digital Presence:**
```
employee_count = 4 → bracket 2–5 → emp_score = 20
has_whatsapp_biz = true → bonus = 10

E2 = min(20 + 10, 30) = 30 → dinormalisasi ke 0-100 = 75
```

**E3 — Riwayat Pinjaman:**
```
loan_history_count = 2
loan_prev_status = 'lunas' semua → status_base = 40
recency_bonus = +15 (pinjaman terakhir < 2 skorinajan lalu)

E3 = min(40 + 15 + (2×5), 100) = min(65, 100) = 65
```

**S_experience final:**
```
S_experience = (E1×0.40) + (E2×0.30) + (E3×0.30)
             = (88×0.40) + (75×0.30) + (65×0.30)
             = 35.2 + 22.5 + 19.5
             = 77.2 → dibulatkan 77
```
*(E1 dinormalisasi ke 0–100: 44/50×100 = 88)*

---

#### 📍 S_location — Target: L1×0.40 + L2×0.30 + L3×0.30

**L1 — Jarak ke Pasar:**
```
market_distance = 0.3 km → bracket ≤0.5km → prox = 35 → L1 = 100
```

**L2 — Kepadatan Bisnis:**
```
business_density = 25 → bracket ≥20 → dens = 30 → L2 = 100
```

**L3 — Infrastruktur:**
```
has_road_access = true → +20
has_bank_nearby = true → +15
infra total = 35 → L3 = 100
```

**S_location final:**
```
S_location = (100×0.40) + (100×0.30) + (100×0.30)
           = 40 + 30 + 30
           = 100
```

---

#### 🧠 S_character — Target: CH1×0.50 + CH2×0.30 + CH3×0.20

**CH1 — Marketplace/Social Proof:**
```
marketplace_rating = N/A (tidak jualan online)
→ default neutral = 50
CH1 = 50
```

**CH2 — Sentiment & Konsistensi:**
```
sentiment_score = 0.75 → bracket ≥0.5 → sent_pts = 35
completeness    = 95%  → bracket ≥90% → comp_pts = 35
contradiction   = 0    → hon_pts = 30

CH2 = min(35 + 35 + 30, 100) = 100
```

**CH3 — Psikometrik (Advanced):**
```
psikometrik diisi lengkap → hasil: risk_tolerance = medium,
consistency_high = true → CH3 = 75
```

**S_character final:**
```
S_character = (CH1×0.50) + (CH2×0.30) + (CH3×0.20)
            = (50×0.50) + (100×0.30) + (75×0.20)
            = 25 + 30 + 15
            = 70
```

---

### 🔐 CONFIDENCE MULTIPLIER

```
M_financial  : rekening koran valid, OCR confidence 92%,
               qris aktif, tidak ada anomali → M = 0.95

M_collateral : foto EXIF metadata valid, GPS match,
               foto kondisi bagus → M = 0.92

M_experience : data konsisten, loan history terverifikasi → M = 0.90

M_location   : GPS plausibility tinggi, alamat match → M = 0.95

M_character  : psikometrik ada, marketplace N/A tapi
               sentiment kuat → M = 0.85
```

---

### 📊 AGGREGASI FINAL

```
ADJUSTED SCORES (Sub-Skor × Multiplier):
├── S_financial_adj  = 92  × 0.95 = 87.40
├── S_collateral_adj = 89  × 0.92 = 81.88
├── S_experience_adj = 77  × 0.90 = 69.30
├── S_location_adj   = 100 × 0.95 = 95.00
└── S_character_adj  = 70  × 0.85 = 59.50

RAW SCORE (Adjusted × Bobot):
├── Financial  : 87.40 × 0.40 = 34.96
├── Collateral : 81.88 × 0.25 = 20.47
├── Experience : 69.30 × 0.15 = 10.40
├── Location   : 95.00 × 0.10 =  9.50
└── Character  : 59.50 × 0.10 =  5.95
                              ─────────
Raw Score Total              =  81.28

FINAL SCORE:
= clamp(300 + 81.28 × 5.50, 300, 850)
= clamp(300 + 447.04, 300, 850)
= clamp(747.04, 300, 850)
= 747

GCS = (0.95×0.40)+(0.92×0.25)+(0.90×0.15)+(0.95×0.10)+(0.85×0.10)
    = 0.380 + 0.230 + 0.135 + 0.095 + 0.085
    = 0.925 → "Sufficient" ✅
```

---

### 🏆 HASIL AKHIR BU DEWI

```
┌─────────────────────────────────────────┐
│  FINAL SCORE        : 747               │
│  RISK LEVEL         : LOW 🔵            │
│  GCS                : 0.925 (Sufficient)│
│                                         │
│  REKOMENDASI PINJAMAN:                  │
│  Max Pinjaman  : 65jt × 2.0 = Rp 130jt │
│  Tenor         : 12 bulan               │
│  Bunga         : 14–18% per skorinajan       │
└─────────────────────────────────────────┘
```

---
---

# 🟡 SKENARIO 2 — Pengusaha Menengah (Mid-Tier)

## Profil: Pak Rudi — Bengkel Motor + Jual Spare Part

> Pak Rudi, 44 skorinajan. Bengkel motor pinggir jalan, sudah 4 skorinajan, 2 karyawan tetap + 1 magang. Tidak pakai QRIS, semua cash. Punya rekening BRI tapi jarang pakai. Lokasi di gang kecil tapi ramai. Pernah pinjam KUR tapi sempat telat bayar 2 bulan.

---

### 📥 DATA INPUT

```
KEUANGAN:
├── monthly_revenue      = Rp 22.000.000
├── monthly_expense      = Rp 15.000.000
├── profit_ratio         = 7jt / 22jt = 0.318 (31.8%)
├── tx_frequency         = 80 transaksi/bulan
├── consistency_penalty  = -10 (ada 1 bulan drop 40%)
├── qris_monthly_volume  = Rp 0 (tidak pakai QRIS)
└── has_multiple_docs    = false (hanya 1 nota)

ASET / COLLATERAL:
├── asset_value          = Rp 85.000.000 (peralatan bengkel + stok)
├── loan_outstanding     = Rp 30.000.000 (sisa KUR)
├── asset_coverage_ratio = 85jt / 30jt = 2.83
├── has_fixed_location   = true (kontrak sewa)
├── photo_verified       = true
└── photo_condition_score= 60 (cukup berantakan)

PENGALAMAN:
├── years_operating      = 4 skorinajan
├── employee_count       = 2 tetap + 1 magang
├── has_whatsapp_biz     = false (WA biasa)
├── loan_history_count   = 1
└── loan_prev_status     = 'telat' (2 bulan, lunas akhirnya)

LOKASI:
├── market_distance_km   = 1.2 km
├── business_density_500m= 12 bisnis
├── has_road_access      = false (gang kecil)
└── has_bank_nearby      = true (BRI 1.5 km)

KARAKTER:
├── sentiment_score      = 0.35 (agak defensive soal keterlambatan KUR)
├── completeness_pct     = 78%
└── contradiction_count  = 2 (bilang tidak pernah telat, tapi data KUR beda)
```

---

### ⚙️ PERHITUNGAN SUB-SKOR

**F1 — Profitability:**
```
profit_ratio = 0.318 → bracket ≥0.30 → base = 50
revenue = 22jt → bracket ≥20jt → rev_bonus = 25
has_multiple_docs = false → doc_bonus = 5

F1 = min(50 + 25 + 5, 100) = 80
```

**F2 — Volume & Consistency:**
```
tx_freq = 80 → medium → score = 20
consistency_penalty = -10 (ada drop bulan) → consistency = 20
F2 = min(20 + 20, 100) = 40
```

**F3 — Digital Cashflow:**
```
qris_volume = 0 → tidak ada data digital → F3 = 0
(Advanced mode, tapi tidak pakai QRIS)
```

**S_financial:**
```
= (80×0.50) + (40×0.30) + (0×0.20)
= 40 + 12 + 0
= 52
```

**C1 — Asset Coverage:**
```
effective_coverage = 2.83 × 0.8 × 0.7 = 1.58
→ bracket 1.0–2.0 → C1 = 65
```

**C2 — Lokasi & Kondisi:**
```
has_fixed_location = true (sewa) → +35 (bukan milik = lebih rendah)
photo_verified = true → +30
photo_condition = 60 → 60% × 20 = 12

C2 = min(35 + 30 + 12, 100) = 77
```

**S_collateral:**
```
= (65×0.70) + (77×0.30)
= 45.5 + 23.1
= 68.6 → 69
```

**E1 — Lama Usaha:**
```
years = 4 → bracket 3–5 skorinajan → year_score = 30
Dinormalisasi: 30/40×100 = 75 → E1 = 75
```

**E2 — Karyawan:**
```
employee_count = 2 tetap → emp_score = 20
no_whatsapp_biz → no bonus

E2 = 20/30×100 = 67
```

**E3 — Riwayat Pinjaman:**
```
loan_prev_status = 'telat' → status_base = 20 (bukan macet, tapi telat)
loan_history_count = 1 → +5
recency_bonus = +5

E3 = min(20 + 5 + 5, 100) = 30
```

**S_experience:**
```
= (75×0.40) + (67×0.30) + (30×0.30)
= 30 + 20.1 + 9
= 59.1 → 59
```

**S_location:**
```
L1: market_km = 1.2 → bracket 1–2km → prox = 30 → L1 = 86
L2: density = 12  → bracket 10–20  → dens = 25 → L2 = 83
L3: no road_access → 0, bank_nearby → +15 → infra = 15 → L3 = 43

S_location = (86×0.40) + (83×0.30) + (43×0.30)
           = 34.4 + 24.9 + 12.9
           = 72.2 → 72
```

**CH2 — Sentiment & Konsistensi:**
```
sentiment = 0.35 → bracket 0.2–0.5 → sent_pts = 30
completeness = 78% → bracket 70–90% → comp_pts = 25
contradiction = 2 → hon_pts = 10

CH2 = min(30 + 25 + 10, 100) = 65
```

**S_character:**
```
CH1 = 50 (tidak ada marketplace)
CH3 = 55 (psikometrik: agak defensif)

= (50×0.50) + (65×0.30) + (55×0.20)
= 25 + 19.5 + 11
= 55.5 → 56
```

---

### 🔐 CONFIDENCE MULTIPLIER PAK RUDI

```
M_financial  : hanya 1 dokumen, tidak ada QRIS,
               OCR confidence 70% → M = 0.68

M_collateral : foto ada tapi kondisi buruk,
               sewa bukan milik → M = 0.75

M_experience : ada riwayat telat, data sedikit → M = 0.72

M_location   : GPS match tapi jalan kecil → M = 0.85

M_character  : ada kontradiksi 2x, defensif → M = 0.70
```

---

### 📊 AGGREGASI FINAL PAK RUDI

```
ADJUSTED SCORES:
├── S_financial_adj  = 52 × 0.68 = 35.36
├── S_collateral_adj = 69 × 0.75 = 51.75
├── S_experience_adj = 59 × 0.72 = 42.48
├── S_location_adj   = 72 × 0.85 = 61.20
└── S_character_adj  = 56 × 0.70 = 39.20

RAW SCORE:
├── Financial  : 35.36 × 0.40 = 14.14
├── Collateral : 51.75 × 0.25 = 12.94
├── Experience : 42.48 × 0.15 =  6.37
├── Location   : 61.20 × 0.10 =  6.12
└── Character  : 39.20 × 0.10 =  3.92
                              ─────────
Raw Score                    = 43.49

FINAL SCORE:
= clamp(300 + 43.49 × 5.50, 300, 850)
= clamp(300 + 239.20, 300, 850)
= 539

GCS = (0.68×0.40)+(0.75×0.25)+(0.72×0.15)+(0.85×0.10)+(0.70×0.10)
    = 0.272 + 0.188 + 0.108 + 0.085 + 0.070
    = 0.723 → "Limited" ⚠️
```

---

### 🏆 HASIL AKHIR PAK RUDI

```
┌─────────────────────────────────────────────┐
│  FINAL SCORE        : 539                   │
│  RISK LEVEL         : HIGH 🟠               │
│  GCS                : 0.723 (Limited)       │
│                                             │
│  REKOMENDASI PINJAMAN:                      │
│  Max Pinjaman  : 22jt × 0.5 = Rp 11jt      │
│  Tenor         : 3 bulan                   │
│  Bunga         : 24–30% per skorinajan           │
│                                             │
│  ⚠️ Catatan AI:                             │
│  "Data keuangan kurang terdokumentasi.      │
│   Riwayat keterlambatan perlu klarifikasi." │
└─────────────────────────────────────────────┘
```

---
---

# 🔴 SKENARIO 3 — Pengusaha Low-Tier (High Risk)

## Profil: Pak Asep — Warung Kelontong Kecil

> Pak Asep, 52 skorinajan. Warung kelontong di rumah sendiri, sudah 2 skorinajan, sendirian tanpa karyawan. Semua cash, tidak ada dokumen apapun, tidak ada rekening koran. Pernah ada pinjaman ke koperasi yang macet Rp 3 juta. Tidak terlalu kooperatif saat wawancara, banyak jawaban tidak konsisten.

---

### 📥 DATA INPUT

```
KEUANGAN:
├── monthly_revenue      = Rp 4.500.000
├── monthly_expense      = Rp 3.800.000
├── profit_ratio         = 700rb / 4.5jt = 0.156 (15.6%)
├── tx_frequency         = 30 transaksi/bulan (estimasi)
├── consistency_penalty  = -15 (income tidak konsisten)
├── qris_monthly_volume  = Rp 0
└── has_multiple_docs    = false (tidak ada)

ASET / COLLATERAL:
├── asset_value          = Rp 15.000.000 (stok + perabot)
├── loan_outstanding     = Rp 3.000.000 (koperasi macet!)
├── asset_coverage_ratio = 15jt / 3jt = 5.0
      (tapi ini pinjaman MACET → trigger Hard Block check!)
├── has_fixed_location   = true (rumah sendiri)
├── photo_verified       = false (tidak mau foto)
└── photo_condition_score= 0

PENGALAMAN:
├── years_operating      = 2 skorinajan
├── employee_count       = 0
├── has_whatsapp_biz     = false
├── loan_history_count   = 1
└── loan_prev_status     = 'macet' — Rp 3.000.000

LOKASI:
├── market_distance_km   = 3.5 km
├── business_density_500m= 3 bisnis
├── has_road_access      = true (jalan kampung)
└── has_bank_nearby      = false

KARAKTER:
├── sentiment_score      = -0.10 (defensif, tidak kooperatif)
├── completeness_pct     = 45%
└── contradiction_count  = 4
```

---

### 🚨 HARD BLOCK CHECK PERTAMA

```
prev_loan_status = 'macet'
loan_amount = Rp 3.000.000

Cek rule:
→ macet AND amount > 10.000.000? 
→ 3.000.000 < 10.000.000 → TIDAK TRIGGER HARD BLOCK

⚠️ Lanjut scoring, tapi catat fraud_signal dengan
   severity = MEDIUM karena ada riwayat macet.
```

*(Kalau pinjamannya macet >10 juta, langsung berhenti di sini dan skor = 380)*

---

### ⚙️ PERHITUNGAN SUB-SKOR

**F1 — Profitability:**
```
profit_ratio = 0.156 → bracket 0.10–0.20 → base = 30
revenue = 4.5jt → bracket ≥2jt → rev_bonus = 10
has_multiple_docs = false → doc_bonus = 5

F1 = min(30 + 10 + 5, 100) = 45
```

**F2 — Volume & Consistency:**
```
tx_freq = 30 → sangat rendah → score = 10
consistency_penalty = -15 → consistency = max(0, 20-15) = 5
F2 = min(10 + 5, 100) = 15
```

**F3 = 0** (tidak ada digital sama sekali)

**S_financial:**
```
= (45×0.50) + (15×0.30) + (0×0.20)
= 22.5 + 4.5 + 0
= 27
```

**C1 — Asset Coverage:**
```
effective_coverage = 5.0 × 0.8 × 0.7 = 2.8
→ bracket 2–3 → C1 = 70
(Tapi ini anomali — aset 15jt vs hutang 3jt yang macet)
→ Fraud signal ditambahkan: asset_vs_macet_inconsistency
```

**C2 — Lokasi & Kondisi:**
```
has_fixed_location = true (rumah) → +35
photo_verified = false → 0
photo_condition = 0 → 0

C2 = 35
```

**S_collateral:**
```
= (70×0.70) + (35×0.30)
= 49 + 10.5
= 59.5 → 60
```

**E1 — Lama Usaha:**
```
years = 2 → bracket 1–3 skorinajan → year_score = 20
Dinormalisasi: 20/40×100 = 50 → E1 = 50
```

**E2 = 5** (tidak ada karyawan, tidak ada WA bisnis)

**E3 — Riwayat Pinjaman:**
```
loan_prev_status = 'macet' → status_base = 5
loan_history = 1 → +5
E3 = 10
```

**S_experience:**
```
= (50×0.40) + (5×0.30) + (10×0.30)
= 20 + 1.5 + 3
= 24.5 → 25
```

**S_location:**
```
L1: market_km = 3.5 → bracket 2–5km → prox = 15 → L1 = 43
L2: density = 3 → bracket <5 → dens = 5 → L2 = 17
L3: road_access (kampung) = +10, no_bank → 0 → L3 = 29

S_location = (43×0.40) + (17×0.30) + (29×0.30)
           = 17.2 + 5.1 + 8.7
           = 31
```

**CH2:**
```
sentiment = -0.10 → bracket -0.3–0.0 → sent_pts = 15
completeness = 45% → bracket <50% → comp_pts = 5
contradiction = 4 → hon_pts = 0

CH2 = 20
```

**S_character:**
```
CH1 = 50, CH3 = 30 (psikometrik tidak kooperatif)

= (50×0.50) + (20×0.30) + (30×0.20)
= 25 + 6 + 6
= 37
```

---

### 🔐 CONFIDENCE MULTIPLIER PAK ASEP

```
M_financial  : tidak ada dokumen, tidak ada QRIS,
               riwayat macet → M = 0.50 (FLOOR/minimum)
               → Fraud flag = TRUE → Soft Cap aktif!

M_collateral : tidak mau foto, data aset tidak terverifikasi
               → M = 0.55

M_experience : data minim, riwayat buruk → M = 0.58

M_location   : GPS plausibility rendah (tidak kooperatif) → M = 0.70

M_character  : banyak kontradiksi, tidak kooperatif → M = 0.55
```

---

### 📊 AGGREGASI FINAL PAK ASEP

```
ADJUSTED SCORES:
├── S_financial_adj  = 27 × 0.50 = 13.50
├── S_collateral_adj = 60 × 0.55 = 33.00
├── S_experience_adj = 25 × 0.58 = 14.50
├── S_location_adj   = 31 × 0.70 = 21.70
└── S_character_adj  = 37 × 0.55 = 20.35

RAW SCORE:
├── Financial  : 13.50 × 0.40 =  5.40
├── Collateral : 33.00 × 0.25 =  8.25
├── Experience : 14.50 × 0.15 =  2.18
├── Location   : 21.70 × 0.10 =  2.17
└── Character  : 20.35 × 0.10 =  2.04
                              ─────────
Raw Score                    = 20.04

SEBELUM SOFT CAP:
= clamp(300 + 20.04 × 5.50, 300, 850)
= clamp(300 + 110.22, 300, 850)
= 410

SOFT CAP CHECK (M_financial = 0.50 → fraud_flag = TRUE):
→ final_score = min(410, 579)
→ 410 < 579 → tidak berubah

GCS = (0.50×0.40)+(0.55×0.25)+(0.58×0.15)+(0.70×0.10)+(0.55×0.10)
    = 0.200 + 0.138 + 0.087 + 0.070 + 0.055
    = 0.550 → "Insufficient" ❌
```

---

### 🏆 HASIL AKHIR PAK ASEP

```
┌─────────────────────────────────────────────────┐
│  FINAL SCORE        : 410                       │
│  RISK LEVEL         : VERY HIGH 🔴              │
│  GCS                : 0.550 (Insufficient)      │
│  FRAUD FLAG         : TRUE ⚠️                   │
│                                                 │
│  REKOMENDASI PINJAMAN:                          │
│  ❌ TIDAK ELIGIBLE                              │
│  Alasan: Skor di bawah 450, data tidak          │
│  mencukupi, riwayat kredit bermasalah.          │
│                                                 │
│  💡 Saran AI ke Pak Asep:                       │
│  "Kami sarankan untuk mulai mendokumentasikan   │
│   keuangan harian, daftarkan QRIS gratis, dan  │
│   selesaikan kewajiban pinjaman sebelumnya      │
│   sebelum mengajukan kembali."                  │
└─────────────────────────────────────────────────┘
```

---

## 📊 Perbandingan Ketiga Skenario

| Komponen | Bu Dewi 👑 | Pak Rudi 🟡 | Pak Asep 🔴 |
|---|---|---|---|
| S_financial | 92 | 52 | 27 |
| S_collateral | 89 | 69 | 60 |
| S_experience | 77 | 59 | 25 |
| S_location | 100 | 72 | 31 |
| S_character | 70 | 56 | 37 |
| **Avg Multiplier** | **0.914** | **0.740** | **0.576** |
| **Raw Score** | **81.28** | **43.49** | **20.04** |
| **Final Score** | **747** | **539** | **410** |
| **Risk Level** | Low 🔵 | High 🟠 | Very High 🔴 |
| **Max Pinjaman** | Rp 130jt | Rp 11jt | ❌ Ditolak |

---

## 💡 Insight Penting dari Simulasi Ini

Ada tiga pola menarik yang perlu kamu catat. Pertama, **multiplier itu jauh lebih berpengaruh dari raw skor itu sendiri** — Pak Rudi punya raw skor 52 di financial, tapi multiplier 0.68 membuatnya jadi 35. Bu Dewi raw-nya 92, tapi multiplier 0.95 membuatnya tetap 87. Bedanya jauh. Artinya, **kualitas data jauh lebih menentukan nasib skor daripada klaim angka semata.**

Kedua, **S_collateral bisa "menyelamatkan" bisnis kecil sekalipun** — Pak Asep yang finansialnya lemah masih dapat skor collateral 60 karena punya rumah sendiri sebagai lokasi usaha. Ini realistis dan adil.

Ketiga, **character score yang rendah tidak bisa dikompensasi pilar lain** — Pak Asep kehilangan banyak poin bukan karena bisnisnya buruk, tapi karena sikapnya tidak kooperatif dan banyak kontradiksi. Ini sinyal penting buat lender.

---

Bro, ini simulasi lengkapnya. Mau dilanjut ke mana? Kita bisa bahas implementasi kode backend-nya dari sini, atau mau langsung ke desain **perbaikan V3.1** yang kita sepakati tadi — khususnya industry-aware margin normalization dan offline business mode?