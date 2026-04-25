# UMKM Credit Scoring Engine — Spec V3.1

**Versi:** 3.1 — Upgrade dari V3.0 dengan penyempurnaan formula, multipliers, dan decision logic  
**Tanggal:** April 2026  
**Status:** Implementation-ready

---

## Ringkasan Eksekutif

Dokumen ini adalah spesifikasi final Scoring Engine V3.1 untuk prototype UMKM Credit Scoring Platform. Upgrade dari V3.0 mencakup:

- **S_collateral** sebagai pilar baru (menggantikan S_document yang menjadi pure multiplier)
- **Category-aware HPP estimation** pada Basic mode
- **Fraud soft cap** dengan ceiling 579
- **Confidence multipliers** yang lebih granular per pilar
- **Hard block** untuk kasus macet dan contradiction tinggi
- **Dual-write contradiction** tracking (real-time + immutable snapshot)

---

## 1. Arsitektur & Pipeline

```
Input Layer → Normalisasi → Confidence Multiplier → Adjusted Scores → Aggregasi → Final Score → Post-process
```

### Pipeline Detail:

1. **Input Layer:** Data dari Chatbot (Gemini), OCR (Azure AI), GPS, marketplace, e-wallet
2. **Normalisasi:** Map setiap subkomponen ke 0–100
3. **Confidence Multiplier:** Hitung `M_i` per pilar (range 0.50–1.00)
4. **Adjusted Scores:** `S_adj[i] = S[i] × M[i]` (dengan floor per pilar)
5. **Aggregasi:** `Raw_Score = Σ(S_adj[i] × w[i])`
6. **Final Score:** `Final = clamp(round(300 + Raw_Score × 5.50), 300, 850)`
7. **Post-process:** Apply soft-cap bila fraud flag aktif; persist fraud_signals

---

## 2. Bobot Pilar (Definitif V3.1)

| Pilar | Kode | Bobot | Deskripsi |
|-------|------|-------|-----------|
| Financial (Capacity) | `S_financial` | **0.40** | Profitabilitas, volume, digital cashflow |
| Collateral | `S_collateral` | **0.25** | Asset coverage, lokasi tetap, foto verifikasi |
| Experience (Capital) | `S_experience` | **0.15** | Lama usaha, karyawan, riwayat pinjaman |
| Location (Condition) | `S_location` | **0.10** | Proximity pasar, densitas bisnis, infrastruktur |
| Character | `S_character` | **0.10** | Marketplace reputation, sentiment, psikometrik |

**Total: 1.00**

> **Catatan:** S_document dari V2 tidak lagi menjadi pilar terpisah. Dokumen mempengaruhi **confidence multipliers** per pilar.

---

## 3. Formula Lengkap Per Pilar

<!-- SECTION: S_financial -->
### 3.1 S_financial (Bobot: 0.40)

```
S_financial = (F1 × 0.50) + (F2 × 0.30) + (F3 × 0.20)
```

#### F1 — Profitability (0–100)

```python
def calc_F1(revenue, expense, category, mode):
    if mode == 'basic':
        # Category-aware HPP estimation
        hpp_ratio = get_category_hpp(category)  # e.g., 0.60 untuk trading
        estimated_expense = revenue * hpp_ratio
        expense = estimated_expense
    
    npm = (revenue - expense) / revenue if revenue > 0 else 0
    
    # Piecewise linear normalization
    if npm >= 0.30:   return 100
    elif npm >= 0.20: return 70 + (npm - 0.20) / 0.10 * 30
    elif npm >= 0.10: return 40 + (npm - 0.10) / 0.10 * 30
    elif npm >= 0.05: return 20 + (npm - 0.05) / 0.05 * 20
    elif npm > 0:     return 5 + (npm / 0.05) * 15
    else:             return 5  # floor, bukan 0
```

**Category HPP Table (Basic mode):**

| Kategori | HPP Ratio | Contoh |
|----------|-----------|--------|
| Kuliner | 0.55 | Warung, restoran |
| Retail/Trading | 0.65 | Toko kelontong |
| Jasa | 0.30 | Salon, bengkel |
| Online/Digital | 0.40 | Dropship, freelance |
| Produksi | 0.50 | Konveksi, kerajinan |

#### F2 — Volume & Consistency (0–100)

```python
def calc_F2(revenue, tx_freq_daily, has_multiple_months):
    # Revenue tier (0-50)
    if revenue >= 50_000_000:   rev = 50
    elif revenue >= 20_000_000: rev = 40
    elif revenue >= 10_000_000: rev = 30
    elif revenue >= 5_000_000:  rev = 20
    elif revenue >= 2_000_000:  rev = 15
    else:                       rev = 5
    
    # Transaction frequency (0-30)
    if tx_freq_daily >= 20:   tx = 30
    elif tx_freq_daily >= 10: tx = 25
    elif tx_freq_daily >= 5:  tx = 15
    elif tx_freq_daily >= 1:  tx = 10
    else:                     tx = 5
    
    # Consistency bonus (0-20)
    consistency = 20 if has_multiple_months else 5
    
    return min(rev + tx + consistency, 100)
```

#### F3 — Digital Cashflow (0–100) — *Advanced mode only*

```python
def calc_F3(has_qris, has_ewallet, bank_linked, qris_verified):
    """Hanya aktif di Advanced mode. Basic mode: F3 = 0, bobot redistributed."""
    score = 0
    if has_qris:       score += 25
    if qris_verified:  score += 25  # verified via API
    if has_ewallet:    score += 20
    if bank_linked:    score += 30  # OAuth verified
    return min(score, 100)
```

> **Basic mode:** F3 tidak aktif. Bobot F1 menjadi 0.65, F2 menjadi 0.35.

---

<!-- SECTION: S_collateral -->
### 3.2 S_collateral (Bobot: 0.25)

```
S_collateral = (C1 × 0.70) + (C2 × 0.30)
```

#### C1 — Asset Coverage Ratio (0–100)

```python
def calc_C1(assets_estimate, monthly_revenue, asset_type='mixed'):
    if monthly_revenue == 0:
        return 10
    
    coverage = assets_estimate / (monthly_revenue * 12)
    
    # Depreciation & liquidation factor
    liquidation_factors = {
        'property': 0.80,
        'vehicle': 0.60,
        'equipment': 0.50,
        'inventory': 0.40,
        'mixed': 0.55  # default
    }
    adj_coverage = coverage * liquidation_factors.get(asset_type, 0.55)
    
    if adj_coverage >= 2.0:   return 100
    elif adj_coverage >= 1.0: return 70 + (adj_coverage - 1.0) * 30
    elif adj_coverage >= 0.5: return 40 + (adj_coverage - 0.5) * 60
    elif adj_coverage >= 0.2: return 15 + (adj_coverage - 0.2) * 83.3
    else:                     return max(5, adj_coverage * 75)
```

#### C2 — Physical Verification (0–100)

```python
def calc_C2(has_fixed_location, photo_verified, photo_condition_score):
    """photo_condition_score: 0-100 dari AI image analysis"""
    score = 0
    if has_fixed_location: score += 40
    if photo_verified:     score += 30
    score += photo_condition_score * 0.30  # max 30
    return min(round(score), 100)
```

---

<!-- SECTION: S_experience -->
### 3.3 S_experience (Bobot: 0.15)

```
S_experience = (E1 × 0.40) + (E2 × 0.30) + (E3 × 0.30)
```

#### E1 — Years Operating (0–100)

```python
def calc_E1(years):
    if years >= 10:  return 100
    elif years >= 5: return 70 + (years - 5) / 5 * 30
    elif years >= 3: return 50 + (years - 3) / 2 * 20
    elif years >= 1: return 25 + (years - 1) / 2 * 25
    elif years >= 0.5: return 15
    else:            return 5
```

#### E2 — Employee & Digital Presence (0–100)

```python
def calc_E2(employee_count, has_wa_business=False):
    if employee_count >= 20:  emp = 70
    elif employee_count >= 10: emp = 60
    elif employee_count >= 5:  emp = 45
    elif employee_count >= 2:  emp = 30
    elif employee_count >= 1:  emp = 15
    else:                      emp = 5
    
    wa_bonus = 30 if has_wa_business else 0
    return min(emp + wa_bonus, 100)
```

#### E3 — Loan History (0–100)

```python
def calc_E3(loan_count, latest_status, years_since_last):
    if loan_count == 0:
        return 50  # neutral — belum punya history
    
    status_base = {
        'lunas': 70,
        'cicilan_lancar': 60,
        'macet': 10,
        'belum_ada': 50
    }
    base = status_base.get(latest_status, 50)
    
    # Recency bonus
    if years_since_last <= 1:   recency = 20
    elif years_since_last <= 3: recency = 15
    elif years_since_last <= 5: recency = 10
    else:                       recency = 5
    
    # Volume bonus (capped)
    vol_bonus = min(loan_count * 5, 20)
    
    return min(base + recency + vol_bonus, 100)
```

---

<!-- SECTION: S_location -->
### 3.4 S_location (Bobot: 0.10)

```
S_location = (L1 × 0.40) + (L2 × 0.30) + (L3 × 0.30)
```

#### L1 — Market Proximity (0–100)

```python
def calc_L1(market_distance_km):
    if market_distance_km <= 0.5:   return 100
    elif market_distance_km <= 1.0: return 80
    elif market_distance_km <= 2.0: return 60
    elif market_distance_km <= 5.0: return 35
    elif market_distance_km <= 10:  return 15
    else:                           return 5
```

#### L2 — Business Density (0–100)

```python
def calc_L2(business_count_500m):
    if business_count_500m >= 50:   return 100
    elif business_count_500m >= 20: return 75
    elif business_count_500m >= 10: return 50
    elif business_count_500m >= 5:  return 30
    else:                           return 10
```

#### L3 — Infrastructure (0–100)

```python
def calc_L3(road_type, road_access, bank_nearby):
    road_scores = {
        'trunk': 30, 'primary': 25, 'secondary': 20,
        'residential': 10, 'other': 5
    }
    score = road_scores.get(road_type, 5)
    if road_access:  score += 35
    if bank_nearby:  score += 35
    return min(score, 100)
```

---

<!-- SECTION: S_character -->
### 3.5 S_character (Bobot: 0.10)

```
S_character = (CH1 × 0.50) + (CH2 × 0.30) + (CH3 × 0.20)
```

#### CH1 — Marketplace Reputation (0–100)

```python
def calc_CH1(rating, total_reviews, monthly_orders, followers=0):
    if total_reviews == 0 and monthly_orders == 0:
        return 50  # neutral — no marketplace presence
    
    # Rating component (0-40)
    if rating >= 4.5:     r = 40
    elif rating >= 4.0:   r = 30
    elif rating >= 3.5:   r = 20
    else:                 r = 10
    
    # Review volume (0-30)
    if total_reviews >= 100:   rv = 30
    elif total_reviews >= 50:  rv = 20
    elif total_reviews >= 10:  rv = 15
    else:                      rv = 5
    
    # Orders/activity (0-30)
    if monthly_orders >= 50:   o = 30
    elif monthly_orders >= 20: o = 20
    elif monthly_orders >= 5:  o = 15
    else:                      o = 5
    
    return min(r + rv + o, 100)
```

#### CH2 — Sentiment & Behavioral (0–100)

```python
def calc_CH2(sentiment_score, completeness_pct, contradiction_count):
    # Sentiment (0-35) — dari Gemini analysis, range -1.0 to 1.0
    if sentiment_score >= 0.5:    sent = 35
    elif sentiment_score >= 0.2:  sent = 30
    elif sentiment_score >= 0.0:  sent = 25
    elif sentiment_score >= -0.3: sent = 15
    else:                         sent = 5
    
    # Completeness (0-35)
    if completeness_pct >= 90:   comp = 35
    elif completeness_pct >= 70: comp = 25
    elif completeness_pct >= 50: comp = 15
    else:                        comp = 5
    
    # Contradiction penalty (exponential) (0-30)
    if contradiction_count == 0:    hon = 30
    elif contradiction_count <= 1:  hon = 20
    elif contradiction_count <= 2:  hon = 10
    elif contradiction_count <= 4:  hon = 5
    else:                           hon = 0
    
    return min(sent + comp + hon, 100)
```

#### CH3 — Psychometric (0–100) — *Advanced mode only*

```python
def calc_CH3(psychometric_score, mode):
    """Advanced mode: gunakan skor psikometrik dari kuesioner.
    Basic mode: default 50 (neutral)."""
    if mode == 'basic':
        return 50
    return clamp(psychometric_score, 0, 100)
```

---

## 4. Confidence Multipliers (M_i)

Range: **0.50–1.00** per pilar. Multiplier merepresentasikan seberapa percaya kita terhadap data yang mendukung skor pilar tersebut.

### 4.1 M_financial

```python
def calc_M_financial(ocr_docs_count, ocr_avg_confidence, 
                      self_vs_ocr_delta_pct, has_F3, has_anomaly):
    m = 0.60  # base
    
    if ocr_docs_count >= 2: m += 0.15
    elif ocr_docs_count == 1: m += 0.08
    
    if ocr_avg_confidence >= 0.90: m += 0.10
    elif ocr_avg_confidence >= 0.75: m += 0.05
    
    if self_vs_ocr_delta_pct <= 10: m += 0.10
    elif self_vs_ocr_delta_pct <= 20: m += 0.05
    elif self_vs_ocr_delta_pct > 30: m -= 0.10  # penalty
    
    if has_F3: m += 0.05  # digital cashflow available
    
    if has_anomaly:  # wash-trading heuristic triggered
        m = 0.50  # FRAUD FLAG → triggers soft cap
    
    return clamp(m, 0.50, 1.00)
```

### 4.2 M_collateral

```python
def calc_M_collateral(photo_count, has_exif, exif_plausible, 
                       photo_forgery_score):
    m = 0.65
    if photo_count >= 2: m += 0.10
    if has_exif and exif_plausible: m += 0.10
    if photo_forgery_score < 0.3: m += 0.10  # low forgery risk
    elif photo_forgery_score > 0.7: m -= 0.15  # high forgery risk
    if photo_count == 0: m = 0.50
    return clamp(m, 0.50, 1.00)
```

### 4.3 M_experience

```python
def calc_M_experience(has_loan_docs, years_verifiable):
    m = 0.70
    if has_loan_docs: m += 0.15
    if years_verifiable: m += 0.15  # bisa diverifikasi via dokumen
    return clamp(m, 0.50, 1.00)
```

### 4.4 M_location

```python
def calc_M_location(gps_plausibility_score, device_vs_pin_km):
    m = 0.75
    if gps_plausibility_score >= 0.9: m += 0.15
    elif gps_plausibility_score >= 0.7: m += 0.05
    else: m -= 0.10
    
    if device_vs_pin_km > 2.0: m -= 0.15  # suspicious
    elif device_vs_pin_km > 1.0: m -= 0.05
    
    return clamp(m, 0.50, 1.00)
```

### 4.5 M_character

```python
def calc_M_character(has_marketplace, has_psychometric, 
                      sentiment_confidence):
    m = 0.65
    if has_marketplace: m += 0.15
    if has_psychometric: m += 0.10
    if sentiment_confidence == 'high': m += 0.10
    elif sentiment_confidence == 'medium': m += 0.05
    return clamp(m, 0.50, 1.00)
```

### Global Confidence Score (GCS)

```python
def calc_GCS(multipliers, weights):
    """GCS = Σ(M_i × w_i)"""
    return sum(m * w for m, w in zip(multipliers, weights))

# Buckets:
# GCS >= 0.90 → "sufficient" — data lengkap dan terpercaya
# GCS >= 0.75 → "limited"    — data cukup tapi ada gaps
# GCS <  0.75 → "insufficient" — data kurang, skor unreliable
```

---

## 5. Normalisasi Final

```python
def calculate_final_score(sub_scores, multipliers, weights):
    """
    sub_scores: [S_financial, S_collateral, S_experience, S_location, S_character]
    multipliers: [M_financial, M_collateral, M_experience, M_location, M_character]
    weights: [0.40, 0.25, 0.15, 0.10, 0.10]
    """
    # Step 1: Apply multipliers
    adjusted = [s * m for s, m in zip(sub_scores, multipliers)]
    
    # Step 2: Weighted aggregation
    raw_score = sum(a * w for a, w in zip(adjusted, weights))
    
    # Step 3: Map to 300–850
    final = round(300 + raw_score * 5.50)
    
    # Step 4: Clamp
    return max(300, min(850, final))
```

### Risk Level Mapping

| Range | Risk Level | Label | Warna |
|-------|-----------|-------|-------|
| 750–850 | Very Low | Sangat Aman | 🟢 Hijau |
| 650–749 | Low | Aman | 🔵 Biru |
| 550–649 | Medium | Sedang | 🟡 Kuning |
| 450–549 | High | Berisiko | 🟠 Oranye |
| 300–449 | Very High | Sangat Berisiko | 🔴 Merah |

---

## 6. Hard Block & Soft Cap Logic

### Hard Blocks (skor langsung dikunci)

```python
def check_hard_blocks(prev_loan_status, prev_loan_amount, contradiction_count):
    # Hard Block 1: Pinjaman macet besar
    if prev_loan_status == 'macet' and prev_loan_amount > 10_000_000:
        return {
            'blocked': True,
            'final_score': 380,
            'risk_level': 'Very High',
            'reason': 'Riwayat pinjaman macet > 10 juta'
        }
    
    # Hard Block 2: Kontradiksi berlebihan
    if contradiction_count > 6:
        return {
            'blocked': True,
            'final_score': 380,
            'risk_level': 'Very High',
            'reason': 'Terlalu banyak kontradiksi dalam jawaban'
        }
    
    return {'blocked': False}
```

### Soft Cap (fraud flag)

```python
def apply_soft_cap(final_score, fraud_flag):
    """Jika fraud flag aktif (M_financial=0.50), cap skor di 579."""
    if fraud_flag:
        return min(final_score, 579)
    return final_score
```

**Rationale:** Prototype tidak punya human review, jadi soft cap = kompromi UX vs safety. User tetap dapat skor tapi dibatasi di "High Risk" maximum.

---

## 7. Loan Recommendation Logic

```python
def recommend_loan(final_score, monthly_revenue, fraud_flag):
    if fraud_flag:
        return {
            'eligible': False,
            'reason': 'Terdeteksi anomali data — perlu verifikasi manual'
        }
    
    if final_score >= 750:
        return {
            'eligible': True,
            'max_amount': monthly_revenue * 3,
            'tenor_months': 24,
            'interest_range': '10-14%'
        }
    elif final_score >= 650:
        return {
            'eligible': True,
            'max_amount': monthly_revenue * 2,
            'tenor_months': 12,
            'interest_range': '14-18%'
        }
    elif final_score >= 550:
        return {
            'eligible': True,
            'max_amount': monthly_revenue * 1,
            'tenor_months': 6,
            'interest_range': '18-24%'
        }
    elif final_score >= 450:
        return {
            'eligible': True,
            'max_amount': monthly_revenue * 0.5,
            'tenor_months': 3,
            'interest_range': '24-30%'
        }
    else:
        return {
            'eligible': False,
            'reason': 'Skor terlalu rendah untuk rekomendasi pinjaman'
        }
```

---

## 8. Basic vs Advanced Mode

| Aspek | Basic | Advanced |
|-------|-------|---------|
| Interview | Quick, minimal fields | Detailed, COGS+OPEX terpisah |
| F1 expense | Category-aware HPP estimation | User-reported COGS+OPEX |
| F3 (Digital Cashflow) | Tidak aktif | Aktif (QRIS, e-wallet, bank) |
| CH3 (Psychometric) | Default 50 | Kuesioner psikometrik |
| Foto aset | Opsional | Wajib minimal 2 |
| Marketplace link | Opsional | Diminta aktif |
| Default multipliers | Lebih tinggi (conservative) | Lebih granular |
| KYC level | Phone verified + NIK format | Phone + email + KTP + bank |

---

## 9. Auditability & Logging

- `confidence_multipliers` disimpan sebagai **JSONB** di `credit_assessments`
- `fraud_signals` tabel **append-only** — reason, severity, evidence snippets
- `character_analysis_raw` menyimpan contradiction highlights & chat snippets
- `contradiction_count` **dual-write**: incremental di `sessions` (real-time) + snapshot di `credit_assessments` (immutable)
- Semua raw OCR text & document hashes diretain minimal **180 hari**

---

## 10. Unit Test Requirements

| Test Case | Expected Behavior |
|-----------|-------------------|
| Identical input → identical output | Deterministic scoring |
| All scores = 100, all M = 1.0 | Final score = 850 |
| All scores = 0, all M = 0.5 | Final score = 300 |
| Fraud flag aktif, raw = 700 | Final score = 579 (soft cap) |
| prev_loan macet > 10jt | Hard block, score = 380 |
| contradiction_count = 7 | Hard block, score = 380 |
| Basic mode F3 | F3 tidak dihitung, bobot redistributed |
| GCS < 0.75 | data_flag = 'insufficient' |

---

## 11. Versioning & Next Steps

- Spec ini adalah **living document**
- Untuk perubahan bobot atau formula core → buat **ADR** dan bump versi
- Phase 1: Schema migration
- Phase 2: Scoring engine functions + unit tests
- Phase 3: API integration + frontend contract

---

*Document version: V3.1 — April 2026*
