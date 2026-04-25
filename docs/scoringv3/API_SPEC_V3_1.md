# API Specification V3.1 — UMKM Credit Scoring Platform

**Versi:** 3.1  
**Tanggal:** April 2026  
**Backend:** FastAPI (Python)  
**Database:** Supabase PostgreSQL 15+

---

## Base URL

```
Production:  https://api.tahu.id/v1
Staging:     https://staging-api.tahu.id/v1
```

---

## Authentication

Semua endpoint (kecuali yang ditandai `public`) memerlukan Supabase JWT token:

```
Authorization: Bearer <supabase_access_token>
```

---

## 1. Sessions

### POST /sessions — Create New Session

Memulai sesi assessment baru untuk sebuah bisnis.

**Request:**
```json
{
  "business_id": "uuid",
  "mode": "basic" | "advanced"
}
```

**Response (201):**
```json
{
  "session_id": "uuid",
  "business_id": "uuid",
  "mode": "basic",
  "status": "active",
  "interview_stage": "intro",
  "progress_pct": 0,
  "expires_at": "2026-05-01T00:00:00Z",
  "created_at": "2026-04-24T10:00:00Z"
}
```

**Error Cases:**
- `409` — Active session limit reached (max 3 per business in 30 days)
- `429` — Rate limit (max 5 new sessions/day per user)
- `404` — Business not found or not owned by user

### GET /sessions/:id — Get Session Detail

**Response (200):**
```json
{
  "id": "uuid",
  "business_id": "uuid",
  "status": "active",
  "mode": "basic",
  "interview_stage": "keuangan",
  "progress_pct": 45,
  "monthly_revenue": 15000000,
  "monthly_expense": 8000000,
  "transaction_frequency_daily": 12,
  "assets_estimate": 50000000,
  "contradiction_count": 1,
  "expires_at": "2026-05-01T00:00:00Z",
  "created_at": "2026-04-24T10:00:00Z"
}
```

### PATCH /sessions/:id — Update Session

Update interview stage, financial snapshot, atau status.

**Request:**
```json
{
  "interview_stage": "dokumen",
  "progress_pct": 60,
  "monthly_revenue": 15000000,
  "monthly_expense": 8000000
}
```

### POST /sessions/:id/complete — Complete Session

Triggers scoring pipeline.

**Response (200):**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "assessment_id": "uuid",
  "redirect_to": "/dashboard/{assessment_id}"
}
```

---

## 2. Chat

### POST /sessions/:id/messages — Send Chat Message

**Request:**
```json
{
  "content": "Omzet saya sekitar 15 juta per bulan",
  "message_type": "text"
}
```

**Response (200):**
```json
{
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "Omzet saya sekitar 15 juta per bulan",
    "extracted_data": {
      "monthly_revenue": 15000000
    }
  },
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Baik, omzet 15 juta per bulan ya. Kalau pengeluaran bulanan kira-kira berapa?",
    "ui_trigger": null
  }
}
```

**Rate Limit:** 1 msg/sec, burst 5

### GET /sessions/:id/messages — Get Chat History

**Query Params:** `?limit=50&offset=0`

**Response (200):**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Halo! Saya TAHU, asisten AI...",
      "message_type": "text",
      "created_at": "2026-04-24T10:00:00Z"
    }
  ],
  "total": 24,
  "has_more": false
}
```

---

## 3. Documents

### POST /sessions/:id/documents — Upload Document

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File | Yes |
| `doc_type` | string | Yes |

**Accepted doc_type:** `nota`, `struk`, `ktp`, `buku_kas`, `rekening_koran`, `foto_usaha`, `screenshot_marketplace`, `video_pitching`, `other`

**Response (201):**
```json
{
  "id": "uuid",
  "doc_type": "nota",
  "file_url": "https://storage.supabase.co/...",
  "ocr_status": "processing",
  "forensics": {
    "phash": "a1b2c3d4...",
    "has_exif": true,
    "forgery_score": 0.12,
    "duplicate_flag": false
  }
}
```

**Limits:** Max 20 documents per session, max 10MB per file.

### GET /sessions/:id/documents — List Documents

**Response (200):**
```json
{
  "documents": [
    {
      "id": "uuid",
      "doc_type": "nota",
      "ocr_status": "done",
      "ocr_confidence": 0.92,
      "created_at": "2026-04-24T10:05:00Z"
    }
  ]
}
```

---

## 4. Scoring

### POST /calculate-score — Calculate Credit Score

**Trigger:** Called internally when session completes, or manually by admin.

**Request:**
```json
{
  "session_id": "uuid"
}
```

**Response (200):**
```json
{
  "assessment_id": "uuid",
  "final_score": 685,
  "risk_level": "Low",
  "gcs": 0.87,
  "gcs_bucket": "sufficient",
  "data_flag": "complete",
  "fraud_flag": false,
  "fraud_signals": [],
  "sub_scores": {
    "financial": {
      "raw": 78,
      "multiplier": 0.92,
      "adjusted": 71.76,
      "weight": 0.40
    },
    "collateral": {
      "raw": 65,
      "multiplier": 0.85,
      "adjusted": 55.25,
      "weight": 0.25
    },
    "experience": {
      "raw": 70,
      "multiplier": 0.90,
      "adjusted": 63.00,
      "weight": 0.15
    },
    "location": {
      "raw": 72,
      "multiplier": 0.88,
      "adjusted": 63.36,
      "weight": 0.10
    },
    "character": {
      "raw": 68,
      "multiplier": 0.80,
      "adjusted": 54.40,
      "weight": 0.10
    }
  },
  "confidence_multipliers": {
    "financial": 0.92,
    "collateral": 0.85,
    "experience": 0.90,
    "location": 0.88,
    "character": 0.80
  },
  "loan_recommendation": {
    "eligible": true,
    "max_amount": 30000000,
    "tenor_months": 12,
    "interest_range": "14-18%"
  },
  "explanation": "Skor kredit Anda menunjukkan profil risiko rendah..."
}
```

**Error Response (fraud detected):**
```json
{
  "assessment_id": "uuid",
  "final_score": 579,
  "risk_level": "Medium",
  "fraud_flag": true,
  "fraud_signals": [
    {
      "type": "wash_trading_detected",
      "severity": "high",
      "details": "Circular transaction pattern detected",
      "created_at": "2026-04-24T10:30:00Z"
    }
  ],
  "loan_recommendation": {
    "eligible": false,
    "reason": "Terdeteksi anomali data — perlu verifikasi manual"
  }
}
```

### GET /assessments/:id — Get Assessment Detail

Returns full assessment data termasuk sub-scores, explanations, dan fraud signals.

---

## 5. Business Profiles

### POST /businesses — Create Business Profile

**Request:**
```json
{
  "business_name": "Warung Makan Bu Ani",
  "category": "kuliner",
  "description": "Warung nasi padang sejak 2018",
  "years_operating": 8,
  "employee_count": 3,
  "has_fixed_location": true,
  "location_address": "Jl. Raya No. 45, Bandung",
  "location_lat": -6.9175,
  "location_lon": 107.6191,
  "has_prev_loan": true,
  "prev_loan_amount": 5000000,
  "prev_loan_status": "lunas"
}
```

### GET /businesses — List User's Businesses

### GET /businesses/:id — Get Business Detail

### GET /businesses/:id/assessments — Assessment History

Returns semua assessment untuk business tertentu, sorted by date DESC.

---

## 6. Geospatial

### POST /sessions/:id/geoscore — Calculate Location Score

**Request:**
```json
{
  "device_lat": -6.9175,
  "device_lon": 107.6191,
  "manual_lat": -6.9180,
  "manual_lon": 107.6195
}
```

**Response (200):**
```json
{
  "location_score": 72,
  "market_proximity_score": 80,
  "market_nearest_name": "Pasar Anyar",
  "market_distance_km": 0.8,
  "business_density_score": 75,
  "business_count_500m": 47,
  "infrastructure_score": 60,
  "road_access": true,
  "bank_nearby": true,
  "gps_plausibility_score": 0.95,
  "device_vs_pin_km": 0.05
}
```

---

## 7. Error Response Format

Semua error mengikuti format konsisten:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Maximum 5 sessions per day reached",
    "details": {
      "current_count": 5,
      "limit": 5,
      "reset_at": "2026-04-25T00:00:00Z"
    }
  }
}
```

### Standard Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Missing/invalid JWT |
| `FORBIDDEN` | 403 | RLS policy violation |
| `NOT_FOUND` | 404 | Resource not found |
| `SESSION_LIMIT` | 409 | Active session limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `OCR_FAILED` | 500 | Azure OCR processing error |
| `SCORING_ERROR` | 500 | Scoring pipeline error |

---

## 8. Webhooks (Future)

Planned untuk notifikasi ke lender:

- `assessment.completed` — Skor baru tersedia
- `fraud.detected` — Fraud signal terdeteksi
- `session.expired` — Sesi kadaluarsa tanpa completion

---

## 9. Rate Limits Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /sessions | 5/day per user | 24h rolling |
| POST /messages | 1/sec, burst 5 | Per session |
| POST /documents | 20/session | Session lifetime |
| POST /calculate-score | 3/session | Session lifetime |
| GET endpoints | 60/min | Per user |

---

*Document version: V3.1 — April 2026*
