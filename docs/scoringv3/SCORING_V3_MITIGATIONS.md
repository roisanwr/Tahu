# SCORING V3 — Requirements & Mitigations

Dokumen ini merinci aturan, validasi, dan mitigasi yang wajib diimplementasikan untuk mencegah manipulasi, fraud, dan kesalahan skor pada Scoring Engine V3. Dokumen ditujukan untuk tim backend sebelum mulai migrasi schema dan implementasi scoring.

Versi: 3.0
Tanggal: April 2026

---

## Tujuan
- Melindungi pipeline scoring dari *adversarial inputs* (prompt injection, AI-assisted manipulation)
- Mendeteksi dan mengurangi fraud pada dokumen, QRIS, dan laporan transaksi
- Mencegah manipulasi lokasi (GPS spoofing) dan multi-account abuse
- Menyediakan aturan validasi server-side yang deterministik dan auditable
- Menentukan kebutuhan KYC/KYB minimum untuk prototype

---

## Ringkasan Arsitektural (sebelum detail)
1. Input Layer: semua data user (chat, dokumen, GPS, marketplace, bank links) harus melalui *sanitization & validation* sebelum dipakai oleh LLM atau scoring function.
2. Extraction Layer: LLM (Gemini) hanya boleh menerima sanitized transcript dan harus meng-output JSON schema yang tervalidasi server-side.
3. Scoring Layer: server-side validators memastikan angka masuk akal (range checks, cross-field consistency) dan mencatat *fraud_signals* jika ada anomali.
4. Enforcement Layer: berdasarkan severity signals → apply multipliers, soft-caps, require re-upload/clarify, or block.

---

## 1. Server-side Validation Rules (Deterministic)
1.1 Identity & KYC
- NIK: format 16 digits, numeric, apply NIK checksum validation (use official Indonesia NIK rules where available). If invalid => mark `nik_format_valid = false` and set `data_flag = 'limited'`.
- Phone: must be verified via OTP for any advanced mode or document upload. `phone_verified` boolean.
- Email: optional, but encourage verification for lenders.

1.2 Numeric Ranges & Plausibility
- monthly_revenue > 0 and <= 1_000_000_000 (1B) for prototype; if out of range -> set `data_flag = 'insufficient'` and require manual review (or soft fail).
- monthly_expense ≥ 0 and ≤ monthly_revenue. If monthly_expense > monthly_revenue -> set `expense = min(expense, revenue)` AND `consistency_flag`.
- transaction_frequency_daily must be integer between 0 and 10_000.
- assets_estimate must be ≥ 0 and ≤ 100 × monthly_revenue.

1.3 Cross-field Consistency Checks
- If revenue - expense < 0.05 × revenue and category ∈ trading categories with typical HPP ≥ 60% => require COGS clarification.
- If tx_freq_daily reported incompatible with revenue (e.g., revenue 20M and tx_freq_daily = 2 with average ticket 3M) -> flag inconsistency.

1.4 Temporal Validation
- Documents with OCR extracted date must be within 90 days of session.created_at. Older docs reduce multipliers.
- For seasonality-sensitive categories (food, gift, apparel), require 3–12 months of revenue history in advanced mode.

1.5 GPS & Address Validation
- Device GPS coordinates must be inside Indonesian bounding box. If outside -> mark `gps_plausibility_score=0` and `M_location=0.70`.
- If manual pin provided, compute distance between device GPS and manual pin. If distance > 2km -> `gps_plausibility_score` degrade and reduce M_location.

1.6 Document Count & Diversity
- For M_financial=1.00 require at least 2 independent evidences among: bank_statement (screenshot), QRIS verified tx, multiple receipts with different merchants, marketplace sales report.
- Single receipt alone => max `M_financial = 0.85`.

1.7 Bank/QRIS Linkage Heuristics
- If bank/e-wallet linked via OAuth and tx history matched with OCR receipts -> mark `bank_linked = true` and increase F3 reliability.
- If only screenshot without verification -> set `bank_linked = false` and lower multiplier.

---

## 2. LLM Prompt Hardening & Extraction Pipeline
2.1 Sanitization of User Inputs
- Strip control sequences, instructions (lines that begin with "ignore", "abandon", "do not"), code fences, and long embedded JSON structures from user messages before sending to extractor prompt.
- Truncate extremely long messages (> 4k tokens), and flag session for manual re-check if truncation occurs.

2.2 Multi-Extractor Agreement
- Run both: (a) rule-based regex parser for numeric fields (extract numbers, currency, dates), (b) LLM extractor (Gemini). Only accept a field if both parsers return the same normalized value or if server-side plausibility check passes.
- If disagreement: set `consistency_check.discrepancies` and reduce M for affected pillars.

2.3 Strict JSON Schema Enforcement
- The LLM must return a JSON conforming to a strict schema (e.g., using JSON Schema v4). If parse fails or missing required fields -> reject and ask user clarification via UI.

2.4 Extraction Prompt Policies
- Use minimal, deterministic extraction prompts. Avoid system prompts that include actionable instructions that can be overwritten by user messages.
- Use "few-shot" examples that are sanitized and do not come from user content.

2.5 Contradiction Detection
- Track statements by canonical field names. If user provides conflicting values across messages (e.g., earlier said 10M, later said 20M), increment `sessions.contradiction_count` and capture both snippets in `chat_history.extracted_data`.

---

## 3. Document Verification Steps
3.1 Basic Image Forensics
- On upload, capture EXIF metadata (camera model, timestamp, GPS) and store in `documents.meta`.
- Compute perceptual hash (pHash) for each image and store in `documents.phash` to detect duplicates and reused images across different sessions.
- Check for evidence of image editing: recompression artifacts, multiple resaves, anomalous noise patterns. Use heuristics or third-party library (e.g., ImageMagick + libjpeg tests).

3.2 OCR Confidence & Cross-validation
- If OCR confidence < 0.70 -> mark doc as low quality, reduce contribution to M_financial.
- After OCR, attempt to match transaction IDs or merchant names against other uploaded docs; high match = more trust.

3.3 QRIS / Bank Verification
- For QRIS receipts include: QRIS tx id, timestamp, amount. Attempt to verify by calling payment provider APIs (if partner). If verified -> mark `qris_verified=true`.
- If no API, heuristics: check consistent merchant name, timestamp plausibility, and multiple receipts across days for similar merchant → heuristics_weight.

3.4 Document Age
- If OCR date older than 90 days → reduce multiplier for financial evidence. Provide UI message asking for recent docs.

3.5 Multi-evidence Requirement
- For M_financial ≥ 0.95 require at least two independent evidences (e.g., bank+receipt; qris+marketplace). Document this in `consistency_check.flags`.

---

## 4. KYC / KYB Minimum Requirements
4.1 Basic Mode (minimal KYC)
- phone_verified required
- NIK string format validation (but no backend KTP match required)
- No bank link required

4.2 Advanced Mode (stronger KYC — recommended)
- phone_verified + email_verified
- request KTP photo (ktp doc_type) and optional selfie (for future face-match)
- require bank/e-wallet linking OR at least 2 distinct receipts + 1 bank statement screenshot
- if prev_loan_status == 'macet' require bank statement showing settlement or explanation (if not available, auto high risk)

---

## 5. Session & Rate Limiting, Anti-abuse
- Limit active sessions per business_id: max 3 active in 30 days. Track `business_profiles.session_attempt_count`.
- Per-user rate limit: max 5 new sessions/day.
- Rate limit chat messages to prevent token flood or injection attempts: 1 message/second with burst of 5 allowed.
- Limit document uploads per session to 20.
- Record device fingerprint: user agent, IP geolocation, device id (if available). If same device used to create many businesses → raise suspicion.

---

## 6. API & DB Contract Requirements (for backend implementers)
6.1 Requirements in API responses
- `POST /calculate-score` must return `fraud_flag` boolean, `fraud_signals` array (if any), `gcs`, `confidence_multipliers` JSON, and `data_flag`.
- `POST /sessions` must accept `business_id` and `mode` and must return `session_id` and `expires_at`.

6.2 DB fields required
- sessions.contradiction_count INTEGER DEFAULT 0
- sessions.revenue_declared_month INTEGER NULLABLE
- credit_assessments.confidence_multipliers JSONB (per pilar)
- credit_assessments.fraud_flag BOOLEAN DEFAULT FALSE
- fraud_signals table (append-only): signal_type, severity, details JSONB

6.3 Audit trail
- All changes to session inputs or documents must be append-only in chat_history and documents tables (retain raw evidence for at least 90 days).

---

## 7. Monitoring, Alerts & Telemetry
7.1 Metrics to collect (at minimum)
- fraction of sessions with fraud_signals per day
- distribution of GCS across sessions (mean, median, stdev)
- session_attempt_count per business
- number of document OCR failures per day
- percentage of sessions requiring advanced mode

7.2 Alerts
- Spike in fraud_signals (> 3× baseline) → alert ops
- >5% of sessions rate-limited per hour → alert infra
- Persistent OCR failures (>20% of uploads failing) → alert data team

7.3 Logging retention
- Keep raw OCR text and document hashes for at least 180 days for forensics.

---

## 8. Automated Actions & Workflows
8.1 Soft cap automatic action
- When `fraud_signal` severity = high or `M_financial` = 0.50 → apply soft-cap to final_score (max 579) and include `fraud_signals` in response. Prompt user to re-upload evidence or link bank.

8.2 Re-interview flow
- If `consistency_check` shows major discrepancy (>30%) → auto-trigger re-interview question(s) asking for clarification and allow a single re-submit.

8.3 Blocking flow
- If evidence of coordinated wash trading or critical fraud (e.g., same images used for receipts across multiple accounts with different owners) → mark `user_profiles.is_active = FALSE` and log reason. (This is strong action; require admin override to reactivate.)

---

## 9. Implementation Checklist (Minimal first sprint)
1. Implement server-side validators for numeric ranges and cross-field checks.
2. Implement LLM sanitization and JSON schema validation.
3. Add `fraud_signals` table and write code to insert signals when heuristics trigger.
4. Implement EXIF & phash extraction on document upload.
5. Add GPS plausibility scoring (device vs manual pin).
6. Add session rate limit and session_attempt_count enforcement.
7. Make `POST /calculate-score` return required fields (`fraud_flag`, `fraud_signals`, `gcs`, `confidence_multipliers`).

---

## 10. Appendix: Heuristic Rules (Code Snippets)
### NIK checksum (simple placeholder; adapt to official algorithm)
```python
def is_valid_nik(nik: str) -> bool:
    if not nik.isdigit() or len(nik) != 16:
        return False
    # Placeholder: simple checksum based on sum of digits
    s = sum(int(d) for d in nik)
    return s % 7 != 0  # arbitrary rule; replace with official if available
```

### OCR + LLM agreement rule
```python
def accept_field(field_name, regex_value, llm_value):
    if regex_value is None and llm_value is None:
        return None
    if regex_value is not None and llm_value is not None:
        if normalize(regex_value) == normalize(llm_value):
            return normalize(regex_value)
        else:
            mark_discrepancy(field_name, regex_value, llm_value)
            return None
    # if only one exists, accept with low confidence
    mark_low_confidence(field_name)
    return regex_value or llm_value
```

---

Dokumen ini adalah dasar mitigasi yang harus diimplementasikan sebelum backend public launch. Setelah kamu setuju, aku bisa buatkan SQL migration + API changes untuk sprint 1 yang mencakup semua fields dan tables baru yang diperlukan (fraud_signals, multipliers, extra columns).