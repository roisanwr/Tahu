# 🧮 SCORING_RULES.md — Heuristic Scoring Engine v0

> Formula heuristik untuk prototipe. Belum ML — murni rule-based dengan bobot yang bisa di-tune.

---

## Skor Akhir (Final Score)

```
FINAL_SCORE = (S_financial × 0.35) + (S_experience × 0.20) + (S_location × 0.15) + (S_document × 0.15) + (S_character × 0.15)
```

**Range:** 300–850 (mirip FICO untuk familiaritas)

**Mapping ke Risk Level:**

| Range | Risk Level | Label Warna |
|---|---|---|
| 750–850 | Very Low | 🟢 Hijau |
| 650–749 | Low | 🔵 Biru |
| 550–649 | Medium | 🟡 Kuning |
| 450–549 | High | 🟠 Oranye |
| 300–449 | Very High | 🔴 Merah |

---

## 1. Financial Score (S_financial) — Bobot 35%

### Input Variables
- `monthly_revenue` — Omzet bulanan (dari chat / OCR)
- `monthly_expense` — Pengeluaran bulanan
- `profit_ratio` — `(revenue - expense) / revenue`
- `revenue_consistency` — Ada bukti omzet >1 bulan? (OCR multiple docs)

### Formula
```python
def score_financial(revenue, expense, has_multiple_docs):
    profit_ratio = (revenue - expense) / revenue if revenue > 0 else 0
    
    # Base score dari profit ratio (0-50 points)
    if profit_ratio >= 0.30: base = 50
    elif profit_ratio >= 0.20: base = 40
    elif profit_ratio >= 0.10: base = 30
    elif profit_ratio > 0: base = 20
    else: base = 5
    
    # Revenue tier bonus (0-30 points)
    if revenue >= 50_000_000: rev_bonus = 30
    elif revenue >= 20_000_000: rev_bonus = 25
    elif revenue >= 10_000_000: rev_bonus = 20
    elif revenue >= 5_000_000: rev_bonus = 15
    elif revenue >= 2_000_000: rev_bonus = 10
    else: rev_bonus = 5
    
    # Document consistency bonus (0-20 points)
    doc_bonus = 20 if has_multiple_docs else 5
    
    return min(base + rev_bonus + doc_bonus, 100)
```

---

## 2. Experience Score (S_experience) — Bobot 20%

### Input Variables
- `years_operating` — Lama usaha (skorinajan)
- `employee_count` — Jumlah karyawan
- `has_fixed_location` — Punya lokasi tetap?

### Formula
```python
def score_experience(years, employees, has_location):
    # Lama usaha (0-40 points)
    if years >= 5: year_score = 40
    elif years >= 3: year_score = 30
    elif years >= 1: year_score = 20
    elif years >= 0.5: year_score = 10
    else: year_score = 5
    
    # Karyawan (0-30 points)
    if employees >= 10: emp_score = 30
    elif employees >= 5: emp_score = 25
    elif employees >= 2: emp_score = 20
    elif employees >= 1: emp_score = 10
    else: emp_score = 5  # usaha sendiri
    
    # Lokasi tetap (0-30 points)
    loc_score = 30 if has_location else 10
    
    return min(year_score + emp_score + loc_score, 100)
```

---

## 3. Location Score (S_location) — Bobot 15%

### Input Variables
- `market_distance_km` — Jarak ke pasar/pusat ekonomi terdekat
- `business_density_500m` — Jumlah bisnis dalam radius 500m
- `has_road_access` — Akses jalan utama
- `has_bank_nearby` — Bank dalam radius 2km

### Formula
```python
def score_location(market_km, density, road_access, bank_nearby):
    # Proximity to market (0-35 points)
    if market_km <= 0.5: prox = 35
    elif market_km <= 1.0: prox = 30
    elif market_km <= 2.0: prox = 25
    elif market_km <= 5.0: prox = 15
    else: prox = 5
    
    # Business density (0-30 points)
    if density >= 20: dens = 30
    elif density >= 10: dens = 25
    elif density >= 5: dens = 15
    else: dens = 5
    
    # Infrastructure (0-35 points)
    infra = 0
    infra += 20 if road_access else 0
    infra += 15 if bank_nearby else 0
    
    return min(prox + dens + infra, 100)
```

---

## 4. Document Trust Score (S_document) — Bobot 15%

### Input Variables
- `docs_uploaded` — Jumlah dokumen yang di-upload
- `ocr_confidence_avg` — Rata-rata confidence OCR Azure
- `data_consistency` — Apakah data OCR konsisten dengan self-report?

### Formula
```python
def score_document(doc_count, avg_confidence, is_consistent):
    # Jumlah dokumen (0-30 points)
    if doc_count >= 3: doc_pts = 30
    elif doc_count >= 2: doc_pts = 20
    elif doc_count >= 1: doc_pts = 15
    else: doc_pts = 0  # tidak upload sama sekali
    
    # OCR confidence (0-35 points)
    if doc_count == 0: conf_pts = 0
    elif avg_confidence >= 0.90: conf_pts = 35
    elif avg_confidence >= 0.75: conf_pts = 25
    elif avg_confidence >= 0.50: conf_pts = 15
    else: conf_pts = 5
    
    # Konsistensi data (0-35 points)
    if doc_count == 0: cons_pts = 10  # neutral, bukan penalty berat
    elif is_consistent: cons_pts = 35
    else: cons_pts = 10  # inkonsisten = flag
    
    return min(doc_pts + conf_pts + cons_pts, 100)
```

---

## 5. Character Score (S_character) — Bobot 15%

### Input Variables
- `sentiment_score` — Sentiment analysis dari percakapan (Gemini)
- `response_completeness` — Seberapa lengkap user menjawab pertanyaan
- `honesty_flags` — Ada kontradiksi dalam jawaban?

### Formula
```python
def score_character(sentiment, completeness_pct, contradiction_count):
    # Sentiment (0-35 points) — dari Gemini analysis
    # sentiment range: -1.0 (sangat negatif) to 1.0 (sangat positif)
    if sentiment >= 0.5: sent_pts = 35
    elif sentiment >= 0.2: sent_pts = 30
    elif sentiment >= 0.0: sent_pts = 25
    elif sentiment >= -0.3: sent_pts = 15
    else: sent_pts = 5
    
    # Response completeness (0-35 points)
    if completeness_pct >= 90: comp_pts = 35
    elif completeness_pct >= 70: comp_pts = 25
    elif completeness_pct >= 50: comp_pts = 15
    else: comp_pts = 5
    
    # Honesty / Contradiction (0-30 points)
    if contradiction_count == 0: hon_pts = 30
    elif contradiction_count <= 1: hon_pts = 20
    elif contradiction_count <= 2: hon_pts = 10
    else: hon_pts = 0
    
    return min(sent_pts + comp_pts + hon_pts, 100)
```

---

## Normalisasi ke Range 300–850

```python
def normalize_to_final(raw_score_0_100):
    # raw_score_0_100 = weighted sum of all sub-scores (0–100)
    return 300 + (raw_score_0_100 / 100) * 550
```

---

## Loan Recommendation Logic

```python
def recommend_loan(final_score, monthly_revenue):
    if final_score >= 750:
        multiplier = 3.0
        tenor = 24
        interest = "10-14%"
    elif final_score >= 650:
        multiplier = 2.0
        tenor = 12
        interest = "14-18%"
    elif final_score >= 550:
        multiplier = 1.0
        tenor = 6
        interest = "18-24%"
    elif final_score >= 450:
        multiplier = 0.5
        tenor = 3
        interest = "24-30%"
    else:
        return {"eligible": False, "reason": "Skor terlalu rendah untuk rekomendasi pinjaman"}
    
    return {
        "eligible": True,
        "max_amount": monthly_revenue * multiplier,
        "suggested_tenor_months": tenor,
        "interest_range": interest
    }
```
