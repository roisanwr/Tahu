# 📐 API_SPEC.md — UMKM Credit Scoring Platform API Contract

> **Base URL:** `https://api.umkm-score.com/v1` (production) | `http://localhost:8000/v1` (dev)
> **Auth:** Bearer token (Supabase JWT)

---

## 1. Health Check

```
GET /health
```
**Response 200:**
```json
{ "status": "ok", "version": "0.1.0", "timestamp": "2026-04-21T10:00:00Z" }
```

---

## 2. Sessions

### Create Session
```
POST /sessions
Authorization: Bearer <token>
```
**Body:**
```json
{
  "user_id": "uuid",
  "mode": "basic" | "advanced"
}
```
**Response 201:**
```json
{
  "session_id": "uuid",
  "status": "active",
  "interview_stage": "intro",
  "created_at": "ISO8601"
}
```

### Get Session
```
GET /sessions/{session_id}
```
**Response 200:**
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "status": "active" | "completed" | "expired",
  "interview_stage": "intro" | "profil" | "keuangan" | "dokumen" | "geolokasi" | "summary",
  "progress_pct": 45,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 3. Chat

### Send Message
```
POST /chat
Authorization: Bearer <token>
```
**Body:**
```json
{
  "session_id": "uuid",
  "message": "Omzet saya sekitar 15 juta per bulan",
  "message_type": "text" | "image" | "location"
}
```
**Response 200:**
```json
{
  "ai_response": "Terima kasih! Omzet 15 juta per bulan cukup baik. Dari 15 juta itu, kira-kira berapa persen yang jadi keuntungan bersih?",
  "interview_stage": "keuangan",
  "progress_pct": 55,
  "extracted_data": {
    "monthly_revenue": 15000000
  },
  "ui_component": null
}
```

> **`ui_component`** bisa berisi generative UI triggers:
> - `"map_picker"` → munculkan map component
> - `"file_upload"` → munculkan upload widget
> - `"summary_card"` → munculkan ringkasan data

---

## 4. Document Upload (Azure OCR)

### Upload & Extract
```
POST /upload-document
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Body:**
- `session_id`: uuid
- `file`: image (jpg/png/pdf, max 10MB)
- `doc_type`: `"nota"` | `"struk"` | `"ktp"` | `"buku_kas"` | `"other"`

**Response 200:**
```json
{
  "document_id": "uuid",
  "doc_type": "nota",
  "ocr_status": "success",
  "extracted": {
    "total_amount": 450000,
    "items": [
      { "name": "Beras 5kg", "qty": 2, "price": 75000 },
      { "name": "Minyak 2L", "qty": 3, "price": 42000 }
    ],
    "date": "2026-04-15",
    "merchant_name": "Toko Sembako Jaya"
  },
  "confidence": 0.92,
  "raw_text": "..."
}
```

---

## 5. Geospatial Scoring

### Calculate Location Score
```
POST /geoscore
Authorization: Bearer <token>
```
**Body:**
```json
{
  "session_id": "uuid",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "address": "Jl. Merdeka No. 10, Jakarta Pusat"
}
```
**Response 200:**
```json
{
  "location_score": 78,
  "factors": {
    "market_proximity": { "score": 85, "nearest": "Pasar Tanah Abang", "distance_km": 1.2 },
    "business_density": { "score": 72, "count_500m": 23 },
    "infrastructure": { "score": 80, "road_access": true, "bank_nearby": true }
  },
  "coordinates": { "lat": -6.2088, "lng": 106.8456 }
}
```

---

## 6. Credit Scoring

### Calculate Score
```
POST /calculate-score
Authorization: Bearer <token>
```
**Body:**
```json
{
  "session_id": "uuid"
}
```
**Response 200:**
```json
{
  "assessment_id": "uuid",
  "final_score": 680,
  "risk_level": "Low",
  "sub_scores": {
    "financial": { "score": 72, "weight": 0.35 },
    "experience": { "score": 65, "weight": 0.20 },
    "location": { "score": 78, "weight": 0.15 },
    "document_trust": { "score": 80, "weight": 0.15 },
    "character": { "score": 60, "weight": 0.15 }
  },
  "explanation": "Skor kredit 680 menunjukkan risiko RENDAH...",
  "loan_recommendation": {
    "max_amount": 25000000,
    "suggested_tenor": 12,
    "interest_range": "12-18%"
  }
}
```

### Get Assessment
```
GET /assessments/{assessment_id}
```
Returns same schema as calculate-score response.

---

## 7. Error Responses

Semua error mengikuti format:
```json
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Field 'session_id' is required",
  "details": {}
}
```

| HTTP Code | Code | Keterangan |
|---|---|---|
| 400 | VALIDATION_ERROR | Input tidak valid |
| 401 | UNAUTHORIZED | Token missing/expired |
| 404 | NOT_FOUND | Resource tidak ditemukan |
| 429 | RATE_LIMITED | Terlalu banyak request |
| 500 | INTERNAL_ERROR | Server error |
| 503 | AI_SERVICE_UNAVAILABLE | Gemini/Azure timeout |
