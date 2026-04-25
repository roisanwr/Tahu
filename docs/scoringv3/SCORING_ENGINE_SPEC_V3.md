# UMKM Credit Scoring Engine — Spec V3

Versi 3.0 — Implementasi berdasarkan keputusan Fase 0 (Prototype-ready)

Tanggal: April 2026

---

## Ringkasan Eksekutif

Dokumen ini adalah versi final dari spesifikasi scoring yang akan diimplementasikan untuk prototype. Spesifikasi ini menggabungkan SKORING_ENGINE_SPEC_V2, SCORING_RULES.md, dan hasil diskusi fase 0. Fokus utama: memastikan reproducibility, auditability, dan mitigasi per-risiko yang ditemukan oleh tim red-team.

Keputusan utama:
- S_document diimplementasikan sebagai **pure multiplier** (dokumen mempengaruhi multipliers, bukan pilar terpisah).
- Pengukuran `expense` menggunakan pendekatan *category-aware HPP estimation* pada mode Basic; Advanced mode menanyakan OPEX + COGS terpisah.
- Jika *fraud flag* (M_financial = 0.50) aktif → **Soft cap** diterapkan: skor tetap dihitung tetapi tidak bisa naik melebihi ambang High Risk (maks final_score = 579). Fraud flag juga menghasilkan `fraud_signal` append-only log.
- `contradiction_count` dicatat secara *dual-write*: incremental di `sessions` (real-time) dan snapshot di `credit_assessments` (immutable).

---

## 1. Arsitektur & Pipeline (Ringkasan)

Pipeline scoring tetap sama seperti V2:
1. Input Layer: data dari Chatbot (Gemini), OCR, GPS, marketplace, e-wallet
2. Normalisasi: map setiap subkomponen ke 0–100
3. Confidence Multiplier: hitung M_i per pilar (0.50–1.00)
4. Adjusted Scores: S_adj[i] = S[i] × M[i] (dengan floor per pilar)
5. Aggregasi: Raw_Score = Σ(S_adj[i] × w[i])
6. Final Score: Final = clamp(round(300 + Raw_Score × 5.50), 300, 850)
7. Post-process: apply soft-cap bila fraud flag aktif; persist `fraud_signals` jika ditemukan.

---

## 2. Bobot Pilar (Definitif)

- S_financial (Capacity): **0.40**
- S_collateral (Collateral): **0.25**
- S_experience (Capital/Experience): **0.15**
- S_location (Condition): **0.10**
- S_character (Character): **0.10**

---

## 3. Normalisasi Per Pilar — Formula Lengkap

Semua sub-skor dinormalisasi 0–100. Per-pilar rumus seperti V2 dengan penyesuaian:

### 3.1 S_financial (0.40)
S_financial = (F1 × 0.50) + (F2 × 0.30) + (F3 × 0.20)

- F1 (Profitability): gunakan `expense` sebagai TOTAL COST untuk Advanced; untuk Basic gunakan *category HPP estimation*.
- F2 (Volume & Consistency): seperti V2 (tx_freq, consistency penalty)
- F3 (Digital Cashflow): hanya aktif di Advanced mode — QRIS/e-wallet/oAuth data

Detail per subkomponen mengikuti V2 — NPM normalization, revenue tier mapping, and consistency_penalty.

### 3.2 S_collateral (0.25)
S_collateral = (C1 × 0.70) + (C2 × 0.30)
- C1: asset_coverage_ratio dengan depreciation & liquidation factor
- C2: fixed_location + photo_verified + photo_condition_score

### 3.3 S_experience (0.15)
S_experience = (E1 × 0.40) + (E2 × 0.30) + (E3 × 0.30)
- E1: years_operating piecewise linear
- E2: employee_count + whatsapp_business bonus
- E3: loan_history_count + recency_bonus + status_base

### 3.4 S_location (0.10)
S_location = (L1 × 0.40) + (L2 × 0.30) + (L3 × 0.30)
- L1: distance to market (buckets)
- L2: business_density_500m normalized
- L3: road_type + bank_nearby + road_access penalty

### 3.5 S_character (0.10)
S_character = (CH1 × 0.50) + (CH2 × 0.30) + (CH3 × 0.20)
- CH1: marketplace rating + reviews + follower/engagement
- CH2: sentiment analysis, completeness, contradiction_penalty (exponential)
- CH3: psychometric only in Advanced; default = 50

---

## 4. Confidence Multiplier (M_i) — Rules Final

M values in [0.50, 1.00]. Table rules follow V2 but with additions:
- M_financial now uses OCR delta thresholds plus F3 availability bonus and anomaly detection (wash-trading heuristic)
- M_collateral includes photo EXIF metadata analysis score
- M_location includes gps_plausibility_score (compare device GPS vs manual pin vs address)
- M_character uses combined availability of marketplace + psychometric data

Global Confidence Score (GCS) unchanged formula: GCS = Σ(M_i × w_i)

GCS buckets: ≥0.90 sufficient, ≥0.75 limited, <0.75 insufficient.

---

## 5. Hard Block & Soft Cap Logic (Keputusan Final)

- prev_loan_status == 'macet' with amount > 10_000_000 → Hard Block → return final_score = 380 & risk_level = 'Very High'
- contradiction_count > 6 → Hard Block (aggressive threshold for prototype)
- Fraud flag (M_financial == 0.50) → **Soft Cap**: compute final_score normally, then enforce `final_score = min(final_score, 579)`. Also insert a `fraud_signal` record and set `fraud_flag = true`.

Rationale: prototype tidak memiliki human review, so soft cap adalah kompromi UX-safety.

---

## 6. Basic vs Advanced Mode (Implementasi)

- Basic Mode: quick interview, minimal required fields, category-aware HPP estimation, F3 inactive, CH3 default 50, higher default multipliers but conservative.
- Advanced Mode: detailed interview, asks for COGS & OPEX separately, QRIS/e-wallet integration, psychometric questionnaire, asset photos, marketplace links.

Mode selection influences input validation, which questions are asked by Gemini system prompt, and multiplier calculation.

---

## 7. Input Validation & Heuristics (Pre-checks)

Implement backend pre-checks before passing data to scoring:
- NIK format + checksum
- Revenue plausibility vs category (using BPS median table)
- GPS bounding box for Indonesia
- Document date within 90 days for financial documents

If pre-checks fail with high severity, stop and return data_flag='insufficient' with explanation.

---

## 8. Auditability & Logging

- `confidence_multipliers` saved as JSONB in `credit_assessments`
- `fraud_signals` append-only table capturing reason, severity, evidence (extracted_text snippets)
- `character_analysis_raw` store final contradiction highlights and chat snippets for explainability

---

## 9. API Contract (Minimal)

`POST /calculate-score` returns:
- assessment_id, final_score, risk_level, gcs, data_flag, fraud_flag, sub_scores (score, adjusted, multiplier, weight for each pilar), explanation text.

`POST /sessions` must include `business_id` and `mode`.

---

## 10. Tests & Sanity Checks

Unit tests required for:
- deterministic outputs
- floor/ceiling enforcement
- fraud soft cap behavior
- basic >= advanced for identical data

---

## 11. Next Steps

1. Finalize and sign-off spec V3
2. Implement schema migration (Phase 1)
3. Build scoring engine functions with unit tests (Phase 2)
4. Integrate with API & frontend contract (Phase 3)

---

Dokumen ini adalah living doc. Untuk perubahan bobot atau formula core, buat ADR dan bump versi.
