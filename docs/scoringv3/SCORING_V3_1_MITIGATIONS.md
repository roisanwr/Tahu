# SCORING V3.1 — Requirements & Mitigations

**Versi:** 3.1  
**Tanggal:** April 2026  
**Target:** Tim backend — wajib implementasi sebelum scoring engine go-live

---

## Tujuan

1. Melindungi pipeline scoring dari **adversarial inputs** (prompt injection, AI-assisted manipulation)
2. Mendeteksi dan mengurangi **fraud** pada dokumen, QRIS, dan laporan transaksi
3. Mencegah **GPS spoofing** dan **multi-account abuse**
4. Menyediakan **validasi server-side** yang deterministik dan auditable
5. Menentukan **KYC/KYB minimum** untuk prototype

---

## Ringkasan Arsitektural

```
User Input → [Sanitization] → [Validation] → [Extraction (LLM + Regex)] → [Scoring] → [Enforcement]
```

| Layer | Tanggung Jawab |
|-------|----------------|
| **Input** | Sanitize chat, dokumen, GPS, marketplace, bank links |
| **Extraction** | LLM (Gemini) + rule-based regex — harus agree atau flag |
| **Scoring** | Range checks, cross-field consistency, fraud_signal logging |
| **Enforcement** | Apply multipliers, soft-caps, re-upload requests, atau block |

---

## 1. Server-side Validation Rules (Deterministic)

### 1.1 Identity & KYC

```python
# NIK Validation
def validate_nik(nik: str) -> dict:
    if not nik.isdigit() or len(nik) != 16:
        return {'valid': False, 'reason': 'Format NIK harus 16 digit numerik'}
    
    # Checksum placeholder (adapt ke official algorithm)
    s = sum(int(d) for d in nik)
    if s % 7 == 0:
        return {'valid': False, 'reason': 'NIK checksum invalid'}
    
    return {'valid': True}
```

- **Phone:** Wajib OTP verified untuk advanced mode atau document upload
- **Email:** Opsional, encourage verification untuk lender visibility

### 1.2 Numeric Ranges & Plausibility

| Field | Min | Max | Action if violated |
|-------|-----|-----|--------------------|
| `monthly_revenue` | > 0 | ≤ 1,000,000,000 | `data_flag = 'insufficient'` |
| `monthly_expense` | ≥ 0 | ≤ `monthly_revenue` | Cap ke revenue + `consistency_flag` |
| `tx_frequency_daily` | 0 | 10,000 | Reject & re-ask |
| `assets_estimate` | ≥ 0 | ≤ 100 × `monthly_revenue` | Flag & manual review |

### 1.3 Cross-field Consistency

```python
def check_cross_field(revenue, expense, tx_freq, category):
    flags = []
    
    # Profit margin terlalu tipis untuk trading
    if (revenue - expense) < 0.05 * revenue:
        if category in ['retail', 'trading', 'kuliner']:
            flags.append({
                'type': 'thin_margin',
                'severity': 'medium',
                'action': 'require COGS clarification'
            })
    
    # Revenue vs tx_freq incompatible
    avg_ticket = revenue / (tx_freq * 30) if tx_freq > 0 else 0
    if avg_ticket > 5_000_000:  # > 5jt per transaksi suspicious
        flags.append({
            'type': 'high_avg_ticket',
            'severity': 'medium',
            'action': 'flag for review'
        })
    
    return flags
```

### 1.4 Temporal Validation

- Dokumen OCR date harus **≤ 90 hari** dari `session.created_at`
- Dokumen > 90 hari → reduce multiplier for financial evidence
- Kategori seasonal (food, gift, apparel) → require **3–12 bulan** revenue history di Advanced mode

### 1.5 GPS & Address Validation

```python
def validate_gps(device_lat, device_lon, manual_lat, manual_lon):
    # Indonesia bounding box
    if not (-11.0 <= device_lat <= 6.1 and 95.0 <= device_lon <= 141.1):
        return {'plausibility': 0.0, 'M_location_override': 0.70}
    
    # Distance check device vs manual pin
    distance_km = haversine(device_lat, device_lon, manual_lat, manual_lon)
    
    if distance_km > 5.0:
        return {'plausibility': 0.1, 'flag': 'gps_mismatch_critical'}
    elif distance_km > 2.0:
        return {'plausibility': 0.4, 'flag': 'gps_mismatch_warning'}
    elif distance_km > 1.0:
        return {'plausibility': 0.7, 'flag': 'gps_minor_offset'}
    else:
        return {'plausibility': 1.0}
```

### 1.6 Document Count & Diversity

- `M_financial = 1.00` requires **≥ 2 independent evidences** (bank+receipt, QRIS+marketplace, dll)
- Single receipt alone → max `M_financial = 0.85`
- Zero documents → `M_financial = 0.60`

### 1.7 Bank/QRIS Linkage Heuristics

- OAuth linked + tx history match OCR → `bank_linked = true`, boost F3
- Screenshot only tanpa verification → `bank_linked = false`, lower multiplier

---

## 2. LLM Prompt Hardening & Extraction Pipeline

### 2.1 Input Sanitization

```python
def sanitize_user_input(text: str) -> str:
    """Strip injection attempts sebelum kirim ke LLM."""
    # Remove control sequences
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    
    # Strip known injection patterns
    injection_patterns = [
        r'(?i)^(ignore|abandon|forget|disregard)\s+(all|previous|above)',
        r'(?i)system\s*:',
        r'(?i)you\s+are\s+now',
        r'```[\s\S]*```',  # code fences
    ]
    for pattern in injection_patterns:
        text = re.sub(pattern, '[FILTERED]', text)
    
    # Truncate at 4k tokens
    if len(text) > 16000:  # ~4k tokens
        text = text[:16000]
        log_flag('message_truncated', session_id)
    
    return text.strip()
```

### 2.2 Multi-Extractor Agreement

```python
def accept_field(field_name, regex_value, llm_value):
    """Dual extraction: regex + LLM harus agree."""
    if regex_value is None and llm_value is None:
        return None
    
    if regex_value is not None and llm_value is not None:
        if normalize(regex_value) == normalize(llm_value):
            return normalize(regex_value)
        else:
            mark_discrepancy(field_name, regex_value, llm_value)
            return None  # require clarification
    
    # Only one exists — accept with low confidence
    mark_low_confidence(field_name)
    return regex_value or llm_value
```

### 2.3 Strict JSON Schema Enforcement

- LLM output harus conform ke JSON Schema v4
- Parse fail atau missing required fields → reject & minta klarifikasi via UI
- Never trust raw LLM output tanpa server-side validation

### 2.4 Contradiction Detection

```python
def track_contradiction(session_id, field, old_value, new_value):
    """Dual-write: sessions (real-time) + credit_assessments (snapshot)."""
    delta_pct = abs(new_value - old_value) / old_value * 100 if old_value else 0
    
    if delta_pct > 15:  # threshold: >15% change = contradiction
        # Real-time increment
        update_session_contradiction_count(session_id, increment=1)
        
        # Append to chat_history.extracted_data for audit
        append_contradiction_log(session_id, {
            'field': field,
            'old': old_value,
            'new': new_value,
            'delta_pct': delta_pct,
            'timestamp': now()
        })
```

---

## 3. Document Verification Steps

### 3.1 Image Forensics

```python
def analyze_document_image(image_bytes):
    """Run on every document upload."""
    result = {
        'exif': extract_exif(image_bytes),      # camera model, timestamp, GPS
        'phash': compute_phash(image_bytes),      # perceptual hash for dedup
        'forgery_score': detect_forgery(image_bytes),  # 0.0-1.0
    }
    
    # Check duplicate across sessions
    if is_phash_duplicate(result['phash']):
        result['duplicate_flag'] = True
        insert_fraud_signal('duplicate_document', 'high')
    
    return result
```

### 3.2 OCR Confidence & Cross-validation

- OCR confidence < 0.70 → mark sebagai low quality, reduce `M_financial`
- Match transaction IDs / merchant names antar dokumen → higher trust
- OCR date > 90 hari → reduce multiplier + UI warning

### 3.3 QRIS / Bank Verification

- QRIS tx id + timestamp + amount → verify via payment provider API (if partner)
- Jika no API: heuristic check — consistent merchant, timestamp plausible, multiple days
- Bank OAuth verified > screenshot (M boost vs M penalty)

### 3.4 Multi-evidence Requirement

| Evidence Level | M_financial Cap | Requirement |
|---------------|-----------------|-------------|
| ≥ 2 independent | 1.00 | Bank+receipt, QRIS+marketplace, dll |
| 1 verified doc | 0.85 | Single bank statement atau QRIS |
| 1 unverified | 0.75 | Screenshot tanpa verification |
| 0 documents | 0.60 | Chat-only, no evidence |

---

## 4. KYC/KYB Minimum Requirements

### Basic Mode (Minimal KYC)

- `phone_verified` = **wajib**
- NIK string format validation (16 digit, checksum)
- **Tidak** wajib bank link
- **Tidak** wajib KTP photo

### Advanced Mode (Stronger KYC)

- `phone_verified` + `email_verified`
- KTP photo (`doc_type = 'ktp'`) + optional selfie (future face-match)
- Bank/e-wallet linking **ATAU** minimal 2 receipts + 1 bank statement screenshot
- Jika `prev_loan_status == 'macet'` → wajib bank statement showing settlement

---

## 5. Anti-abuse & Rate Limiting

| Limit | Value | Action |
|-------|-------|--------|
| Active sessions per business | Max 3 dalam 30 hari | Block new session |
| New sessions per user per day | Max 5 | Rate limit |
| Chat messages rate | 1 msg/sec, burst 5 | Throttle |
| Document uploads per session | Max 20 | Reject upload |
| Business profiles per user | Max 10 | Block creation |

### Device Fingerprinting

```python
def check_device_abuse(user_agent, ip_geo, device_id):
    """Flag jika device yang sama bikin banyak business profiles."""
    same_device_businesses = count_businesses_by_device(device_id)
    
    if same_device_businesses > 5:
        insert_fraud_signal('multi_business_same_device', 'high', {
            'device_id': device_id,
            'business_count': same_device_businesses
        })
        return {'suspicious': True}
    
    return {'suspicious': False}
```

---

## 6. Monitoring, Alerts & Telemetry

### Metrics (Minimum)

- Fraction of sessions with `fraud_signals` per day
- Distribution of GCS across sessions (mean, median, stdev)
- `session_attempt_count` per business
- Document OCR failure rate
- Percentage sessions requiring advanced mode

### Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| fraud_signals spike > 3× baseline | Critical | Alert ops team |
| > 5% sessions rate-limited per hour | Warning | Alert infra |
| OCR failures > 20% of uploads | Warning | Alert data team |
| Same pHash across > 3 different users | Critical | Block & investigate |

### Retention

- Raw OCR text + document hashes: **180 hari**
- fraud_signals: **365 hari**
- Chat history: **90 hari** minimum
- Audit logs (multiplier_audit): **365 hari**

---

## 7. Automated Actions & Workflows

### 7.1 Soft Cap Flow

```
fraud_signal(severity=high) OR M_financial=0.50
  → final_score = min(final_score, 579)
  → fraud_flag = true in credit_assessments
  → Insert fraud_signal record
  → UI: prompt user to re-upload evidence or link bank
```

### 7.2 Re-interview Flow

```
consistency_check shows delta > 30%
  → Auto-trigger clarification question(s)
  → Allow single re-submit for affected field
  → If still inconsistent → increment contradiction_count + 2
```

### 7.3 Blocking Flow

```
Evidence of coordinated wash trading OR same images across multiple accounts
  → user_profiles.is_active = FALSE
  → Log reason to fraud_signals
  → Require admin override to reactivate
  → All active sessions → status = 'abandoned'
```

---

## 8. Implementation Checklist (Sprint 1)

- [ ] Server-side validators: numeric ranges + cross-field checks
- [ ] LLM sanitization + JSON schema validation
- [ ] `fraud_signals` table + insert logic on heuristic triggers
- [ ] EXIF & pHash extraction on document upload
- [ ] GPS plausibility scoring (device vs manual pin)
- [ ] Session rate limit + `session_attempt_count` enforcement
- [ ] `POST /calculate-score` returns: `fraud_flag`, `fraud_signals`, `gcs`, `confidence_multipliers`
- [ ] Contradiction tracking dual-write
- [ ] Document age validation (90-day rule)
- [ ] OCR confidence threshold checks

---

## 9. Appendix: Heuristic Code Snippets

### Wash-trading Detection

```python
def detect_wash_trading(transactions):
    """Detect suspicious circular transaction patterns."""
    pairs = defaultdict(int)
    for tx in transactions:
        key = (tx['from'], tx['to']) if tx['from'] < tx['to'] else (tx['to'], tx['from'])
        pairs[key] += 1
    
    suspicious = [pair for pair, count in pairs.items() if count > 5]
    if suspicious:
        return {'detected': True, 'pairs': suspicious}
    return {'detected': False}
```

### Revenue Plausibility vs Category

```python
BPS_MEDIAN_REVENUE = {
    'kuliner': 8_000_000,
    'retail': 15_000_000,
    'jasa': 6_000_000,
    'online': 10_000_000,
    'produksi': 12_000_000,
}

def check_revenue_plausibility(revenue, category):
    median = BPS_MEDIAN_REVENUE.get(category, 10_000_000)
    if revenue > median * 10:
        return {'plausible': False, 'flag': 'revenue_10x_above_median'}
    if revenue < median * 0.05:
        return {'plausible': False, 'flag': 'revenue_extremely_low'}
    return {'plausible': True}
```

---

*Document version: V3.1 — April 2026*
