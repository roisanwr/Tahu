Let me conduct deep research across multiple dimensions for building a million-dollar grade chatbot system.# Deep Research: Kunci Membangun Chatbot Setara Jutaan Dolar

Berdasarkan riset dari berbagai sumber internasional, berikut adalah blueprint lengkap agar **Frontend (Next.js TS)**, **Backend (Python)**, dan **Database (Supabase)** berjalan harmonis dan menghasilkan produk berkualitas enterprise.

---

## 1. ARSITEKTUR KOMUNIKASI: Jantung Keharmonisan Sistem

Bagian paling kritis dari chatbot adalah **bagaimana frontend dan backend berkomunikasi**. Chatbot kelas atas tidak menggunakan REST biasa — mereka menggunakan **streaming token-by-token** seperti ChatGPT.

**Protokol yang Tepat:**

Ada tiga opsi utama, dan pilihan terbaik bergantung pada kebutuhan <sup data-citation="19"></sup> <sup data-citation="17"></sup>:

| Protokol | Kapan Digunakan | Kelebihan | Kekurangan |
|---|---|---|---|
| **SSE (Server-Sent Events)** | Streaming respons AI satu arah | Sederhana, native browser, auto-reconnect | Hanya satu arah (server → client) |
| **WebSocket** | Chat real-time dua arah, multi-user | Full duplex, low latency | Lebih kompleks, perlu manage connection state |
| **gRPC Streaming** | Komunikasi antar microservice internal | Sangat cepat, strongly typed | Tidak native di browser, butuh proxy |

**Rekomendasi arsitektur tier jutaan dolar:**
Gunakan **hybrid approach** — SSE untuk streaming respons AI dari Python backend ke Next.js, dan **Supabase Realtime** (berbasis WebSocket) untuk sinkronisasi state antar client <sup data-citation="5"></sup> <sup data-citation="18"></sup>.

**Implementasi flow-nya:**

```
User mengetik → Next.js → POST /api/chat (ke Python FastAPI)
                                    ↓
                          FastAPI proses LLM secara streaming
                                    ↓
                          SSE stream token-by-token → Next.js
                                    ↓
                          Setelah selesai → Simpan ke Supabase
                                    ↓
                          Supabase Realtime → Sync ke semua device
```

---

## 2. BACKEND PYTHON: Engine yang Kokoh

### A. Framework: FastAPI sebagai Fondasi

FastAPI adalah pilihan terbaik karena mendukung **async natively**, auto-generate OpenAPI docs, dan memiliki performa mendekati Go/Node <sup data-citation="31"></sup> <sup data-citation="35"></sup>.

**Arsitektur backend kelas enterprise:**

- **API Layer** → FastAPI (handles HTTP/SSE requests)
- **Task Queue** → Celery + Redis (untuk heavy processing: document ingestion, embedding generation) <sup data-citation="31"></sup> <sup data-citation="34"></sup>
- **LLM Orchestration** → LangChain / LlamaIndex (untuk RAG pipeline)
- **Cache Layer** → Redis (cache frequent queries, session state)
- **Vector Search** → Supabase pgvector (semantic search)

### B. Streaming Response Pattern

Ini yang membuat chatbot terasa "hidup" — respons muncul kata per kata:

```python
# FastAPI SSE endpoint
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        async for chunk in llm.astream(request.messages):
            yield f"data: {json.dumps({'token': chunk.content})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

### C. Asynchronous Task Processing

Untuk tugas berat (PDF ingestion, embedding, analytics), jangan proses di request thread — gunakan **Celery + Redis** <sup data-citation="31"></sup> <sup data-citation="32"></sup>:

```
User upload dokumen → FastAPI terima file → Kirim task ke Celery
                                                    ↓
                                          Celery worker proses:
                                          1. Chunking dokumen
                                          2. Generate embeddings
                                          3. Simpan ke Supabase pgvector
                                                    ↓
                                          Notify frontend via WebSocket
```

---

## 3. FRONTEND NEXT.JS TYPESCRIPT: Pengalaman Premium

### A. Arsitektur State Management

Chatbot premium membutuhkan state management yang sophisticated:

- **Server Components** → Untuk load conversation history (SSR, SEO-friendly)
- **Client Components** → Untuk real-time chat interface
- **Optimistic Updates** → Pesan user langsung muncul sebelum server merespons <sup data-citation="2"></sup>
- **Streaming UI** → Gunakan `ReadableStream` atau library seperti `ai` SDK dari Vercel

### B. Streaming di Frontend

```typescript
// Next.js: Consuming SSE from Python backend
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ messages }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Parse SSE dan update UI token by token
  updateMessage(parseSSE(chunk));
}
```

### C. Next.js API Routes sebagai Proxy

Jangan biarkan frontend langsung call Python backend. Gunakan **Next.js API routes sebagai proxy layer** <sup data-citation="9"></sup>:

```
Browser → Next.js API Route (/api/chat) → Python FastAPI (/chat/stream)
```

Keuntungannya: menyembunyikan backend URL, menambah auth layer, dan menghindari CORS issues.

---

## 4. DATABASE SUPABASE: Fondasi Data yang Skalabel

### A. Schema Design untuk Chat <sup data-citation="4"></sup>

Schema yang scalable harus didesain dengan **normalisasi yang tepat** dan **indexing yang optimal**:

```sql
-- Core tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    model TEXT DEFAULT 'gpt-4',
    system_prompt TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    latency_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector storage untuk RAG
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    content TEXT,
    embedding VECTOR(1536),  -- pgvector extension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_documents_embedding ON documents 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### B. RAG dengan pgvector <sup data-citation="37"></sup> <sup data-citation="40"></sup>

Supabase memiliki **pgvector** built-in, jadi kamu bisa menyimpan embeddings langsung di Postgres tanpa perlu database vektor terpisah:

```sql
-- Function untuk semantic search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
AS $$
    SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

### C. Row Level Security (RLS)

Wajib untuk multi-tenant — setiap user hanya bisa akses data mereka sendiri:

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own conversations"
    ON conversations FOR ALL
    USING (auth.uid() = user_id);
```

### D. Supabase Realtime

Gunakan untuk sync state antar device dan menampilkan **typing indicators** <sup data-citation="2"></sup> <sup data-citation="5"></sup>:

```typescript
// Subscribe ke perubahan messages
supabase
  .channel('conversation:' + conversationId)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    addMessage(payload.new);
  })
  .subscribe();
```

---

## 5. SECURITY: Non-Negotiable untuk Kelas Enterprise

### A. Berlapis-lapis Pertahanan <sup data-citation="21"></sup> <sup data-citation="22"></sup> <sup data-citation="23"></sup>

| Layer | Implementasi |
|---|---|
| **Authentication** | Supabase Auth + JWT + Refresh Token Rotation |
| **Authorization** | RLS di Supabase + RBAC di FastAPI |
| **Rate Limiting** | Redis-based rate limiter (per user, per IP, per endpoint) |
| **Input Validation** | Pydantic di FastAPI + Zod di Next.js |
| **Prompt Injection Guard** | System prompt hardening + input sanitization + guardrails |
| **Data Encryption** | TLS in transit + encryption at rest (Supabase default) |
| **API Key Management** | Environment variables + secret rotation |

### B. Rate Limiting yang Cerdas

```python
# Tiered rate limiting berdasarkan plan
RATE_LIMITS = {
    "free": {"requests": 20, "window": 3600},      # 20/jam
    "pro": {"requests": 200, "window": 3600},       # 200/jam
    "enterprise": {"requests": 2000, "window": 3600} # 2000/jam
}
```

### C. Prompt Injection Prevention <sup data-citation="24"></sup>

```python
def sanitize_user_input(message: str) -> str:
    # Strip potential injection patterns
    dangerous_patterns = [
        "ignore previous instructions",
        "ignore all instructions",
        "system prompt",
        "you are now",
    ]
    for pattern in dangerous_patterns:
        if pattern.lower() in message.lower():
            raise SecurityException("Potential prompt injection detected")
    return message
```

---

## 6. OBSERVABILITY & MONITORING: Mata yang Selalu Terbuka

Chatbot jutaan dolar **harus** memiliki monitoring end-to-end <sup data-citation="26"></sup> <sup data-citation="27"></sup> <sup data-citation="30"></sup>:

### A. LLM-Specific Observability Stack

| Tool | Fungsi |
|---|---|
| **Langfuse** (open-source) | Trace setiap LLM call — latency, tokens, cost, prompt |
| **Helicone** | LLM gateway dengan logging dan caching |
| **Prometheus + Grafana** | Infra monitoring (CPU, memory, request rate) |
| **Sentry** | Error tracking frontend + backend |
| **PostHog / Mixpanel** | User analytics dan behavior tracking |

### B. Metrik Kritis yang Harus Dipantau

- **Time to First Token (TTFT)** — harus < 500ms
- **Tokens per Second (TPS)** — target 30-50 token/s
- **End-to-End Latency** — total waktu respons
- **Error Rate** — target < 0.1%
- **Cost per Conversation** — tracking biaya LLM per user
- **User Satisfaction Score** — thumbs up/down ratio

---

## 7. SKALABILITAS: Dari 10 User ke 10 Juta User

### A. Arsitektur yang Bisa Berkembang

```
                    ┌─────────────────┐
                    │   CDN (Vercel)  │
                    │   Next.js SSR   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
       │  FastAPI #1  │ │  #2    │ │  FastAPI #N  │
       └──────┬──────┘ └────┬────┘ └──────┬──────┘
              │              │              │
       ┌──────▼──────────────▼──────────────▼──────┐
       │              Redis Cluster                 │
       │        (Cache + Queue + Sessions)         │
       └──────────────────┬────────────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
       ┌──────▼───┐ ┌────▼────┐ ┌───▼──────┐
       │ Celery   │ │ Celery  │ │ Celery   │
       │ Worker 1 │ │ Worker 2│ │ Worker N │
       └──────────┘ └─────────┘ └──────────┘
                          │
              ┌───────────▼───────────┐
              │     Supabase          │
              │  (Postgres + pgvector │
              │   + Realtime + Auth)  │
              └───────────────────────┘
```

### B. Caching Strategy

```python
# Multi-level caching
# Level 1: Response cache (exact match)
cache_key = hash(user_message + model + system_prompt)
cached = await redis.get(cache_key)
if cached:
    return cached  # Skip LLM call entirely

# Level 2: Semantic cache (similar queries)
embedding = await get_embedding(user_message)
similar = await semantic_cache_search(embedding, threshold=0.95)
if similar:
    return similar  # Hemat biaya LLM

# Level 3: LLM call (paling mahal)
response = await llm.generate(messages)
await redis.setex(cache_key, 3600, response)  # Cache 1 jam
```

---

## 8. COST OPTIMIZATION: Kunci Profitabilitas

| Strategi | Penghematan Estimasi |
|---|---|
| **Semantic Caching** | 30-50% pengurangan LLM calls |
| **Model Routing** (query mudah → model murah, kompleks → GPT-4) | 40-60% cost reduction |
| **Prompt Compression** | 15-25% token savings |
| **Supabase Connection Pooling** (PgBouncer) | Kurangi DB connections |
| **CDN + Edge Caching** untuk static assets | Kurangi bandwidth cost |
| **Auto-scaling** (scale down saat idle) | Kurangi compute waste |

---

## 9. MULTI-TENANCY: Fondasi SaaS <sup data-citation="41"></sup> <sup data-citation="44"></sup>

Untuk chatbot yang dijual sebagai SaaS, multi-tenancy architecture wajib:

- **Data Isolation** → RLS di Supabase (setiap tenant hanya lihat data mereka)
- **Custom Branding** → Simpan konfigurasi tenant di JSONB column
- **Usage Metering** → Track token usage per tenant untuk billing
- **Plan-based Feature Gating** → Middleware yang cek subscription tier

---

## 10. CI/CD & DEPLOYMENT: Kematangan Engineering

- **Frontend** → Vercel (auto-deploy dari Git, edge network global)
- **Backend** → Docker containers di Railway / Fly.io / AWS ECS
- **Database** → Supabase managed (auto-backup, point-in-time recovery)
- **CI/CD** → GitHub Actions (lint → test → build → deploy)
- **Feature Flags** → LaunchDarkly atau Posthog (gradual rollout)
- **Database Migrations** → Supabase CLI migrations (version-controlled schema)

---

## Ringkasan: 10 Kunci Utama

Secara keseluruhan, ada **10 pilar** yang membuat chatbot bernilai jutaan dolar:

1. **Streaming Architecture** — SSE + Supabase Realtime untuk pengalaman real-time
2. **Async Processing** — FastAPI + Celery + Redis untuk heavy workloads
3. **Proxy Pattern** — Next.js API routes sebagai gateway ke Python backend
4. **Smart Schema** — Normalized tables + pgvector untuk RAG di Supabase
5. **Layered Security** — Auth, RLS, rate limiting, prompt injection guards
6. **LLM Observability** — Langfuse/Helicone untuk trace setiap LLM call
7. **Multi-level Caching** — Redis + semantic cache untuk hemat biaya
8. **Model Routing** — Query mudah ke model murah, kompleks ke model premium
9. **Multi-tenancy** — RLS + usage metering untuk model SaaS
10. **Scalable Infra** — Horizontal scaling dengan load balancer + auto-scaling

---

Ini adalah hasil riset dari berbagai sumber. Apakah kamu ingin saya lanjutkan dengan membuat **diagram arsitektur visual** dari seluruh sistem ini, atau mungkin membuat **boilerplate code** yang lebih detail untuk salah satu komponen spesifik (misalnya schema Supabase lengkap, FastAPI streaming setup, atau Next.js chat UI)?


aku merasa, entah kenapa kan aku seting yaa jawaban dari bot itu klo misalnya koneksi ke api nya gak jalan itu di seting agar dia ngasih jawaban template, nah masalahnya dia selalu seperti itu. contohnya aku udh terhubungnih, abis itu gak lama padahal chatannya belom kelar tiba tiba dia terputus gitu terus yang terjadi, jujur itu aku bingung banget, nah untuk menyelesaikan masalah seperti itu apa yang harus dilakukan. jawab secara detail dan terperinci



Oke, sekarang saya punya gambaran lengkap dari semua sumber. Mari kita bedah masalah ini secara tuntas.

---

# Diagnosis & Solusi Lengkap: Chatbot Putus di Tengah Jalan & Fallback Terpicu Salah

Masalah yang kamu ceritakan sebenarnya bukan satu masalah — ini adalah **rantai masalah** yang saling terhubung. Kita harus selesaikan dari akar, bukan dari gejala.

---

## BAGIAN 1: DIAGNOSIS — Kenapa Ini Terjadi?

Sebelum solusi, kamu harus tahu dulu **di mana rantai putusnya**. Ada 6 pelaku utama:

```
Browser → Next.js → [Proxy/Nginx/Vercel] → Python FastAPI → LLM API
   ↑____________________________________________↓
   Setiap segmen ini bisa jadi sumber putusnya koneksi
```

### 🔴 Pelaku #1: Timeout di Next.js / Vercel

Ini yang paling sering jadi penyebab. Vercel punya batas waktu ketat <sup data-citation="16"></sup> <sup data-citation="18"></sup>:

| Environment | Default Timeout |
|---|---|
| Vercel Hobby (Edge Runtime) | **25 detik** |
| Vercel Hobby (Serverless) | **10 detik** |
| Vercel Pro (Serverless) | **60 detik** |
| Vercel Pro (Edge Runtime) | **25 detik** (streaming harus mulai dalam 25s) |
| Vercel Enterprise | **Max 900 detik** |

Jika chatbot kamu **belum kirim token pertama dalam 10/25 detik**, Vercel langsung **kill koneksi** — dan karena koneksi mati, `try/catch` kamu menangkap error ini dan menjalankan **fallback template response**.

### 🔴 Pelaku #2: Nginx Proxy Buffering

Kalau kamu pakai Nginx (di VPS, Railway, dll), ada masalah fatal yang sering diabaikan <sup data-citation="33"></sup> <sup data-citation="34"></sup>:

> Nginx **menyimpan seluruh respons ke buffer** sebelum mengirim ke client. Akibatnya, streaming tidak terkirim token per token — melainkan dikirim sekaligus di akhir, atau malah **timeout sebelum sempat dikirim sama sekali.**

### 🔴 Pelaku #3: FastAPI Menghentikan Proses Saat Client Disconnect

Ini perilaku default FastAPI yang berbahaya <sup data-citation="21"></sup> <sup data-citation="22"></sup> <sup data-citation="25"></sup>:

Saat koneksi client putus (karena timeout Vercel misalnya), **FastAPI langsung cancel semua generator yang sedang berjalan**. Jadi meskipun LLM sedang proses di tengah-tengah, proses ikut terhenti. Ini menyebabkan data tidak pernah tersimpan ke Supabase, dan client mendapat response kosong/error.

### 🔴 Pelaku #4: Error Handler yang Terlalu Agresif di Frontend

Ini yang membuat fallback template **terpicu padahal koneksi sempat berhasil**. Pola yang salah:

```typescript
// ❌ POLA BERBAHAYA — ini yang kamu lakukan sekarang (kemungkinan besar)
try {
  const response = await fetch('/api/chat');
  // ... process stream
} catch (error) {
  // INI TERPICU untuk SEMUA error, termasuk:
  // - Network timeout (koneksi putus di tengah)
  // - AbortError (user navigasi ke halaman lain)
  // - Partial stream error
  setMessage(FALLBACK_TEMPLATE); // ← Inilah masalahnya!
}
```

Kode ini tidak membedakan antara **"tidak terhubung sama sekali"** vs **"terhubung tapi putus di tengah"**. Keduanya masuk satu `catch` dan keduanya memicu fallback.

### 🔴 Pelaku #5: Tidak Ada Heartbeat / Keepalive

Koneksi SSE yang idle terlalu lama (tidak ada data mengalir) akan **diputus secara otomatis** oleh browser, proxy, atau load balancer <sup data-citation="31"></sup> <sup data-citation="35"></sup>. Jika LLM sedang "berpikir" sebelum mengirim token pertama, koneksi bisa mati dalam keheningan itu.

### 🔴 Pelaku #6: Race Condition di State Management Frontend

Jika streaming sedang berjalan dan user melakukan sesuatu (scroll, klik, tab berpindah), bisa terjadi **AbortController** dipanggil secara tidak sengaja, atau React melakukan re-render yang menutup stream <sup data-citation="26"></sup> <sup data-citation="30"></sup>.

---

## BAGIAN 2: SOLUSI LAYER BY LAYER

### ✅ SOLUSI 1: Perbaiki FastAPI Backend — Heartbeat + Disconnect Handling

Ini solusi paling fundamental. Backend harus:
1. Kirim **heartbeat** setiap beberapa detik agar koneksi tidak dianggap idle
2. **Tidak langsung mati** saat client disconnect — simpan dulu ke Supabase

```python
# backend/routers/chat.py
import asyncio
import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, req: Request):
    
    async def generate_with_heartbeat():
        # Buffer untuk menyimpan response lengkap
        full_response = ""
        heartbeat_interval = 15  # Kirim heartbeat setiap 15 detik
        last_token_time = asyncio.get_event_loop().time()
        
        try:
            # ✅ Bungkus LLM call dalam task terpisah agar tidak langsung cancel
            async for chunk in llm.astream(request.messages):
                
                # Cek apakah client masih connect
                if await req.is_disconnected():
                    # ✅ JANGAN langsung berhenti — simpan dulu ke DB
                    await save_partial_response(
                        conversation_id=request.conversation_id,
                        content=full_response,
                        is_complete=False  # tandai sebagai incomplete
                    )
                    break
                
                token = chunk.content
                full_response += token
                current_time = asyncio.get_event_loop().time()
                
                # ✅ Kirim heartbeat jika terlalu lama tidak ada token
                if current_time - last_token_time > heartbeat_interval:
                    yield ": heartbeat\n\n"  # SSE comment, tidak diproses frontend
                    last_token_time = current_time
                
                # Kirim token ke client
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                last_token_time = current_time
            
            # ✅ Stream selesai sempurna — simpan ke Supabase
            await save_complete_response(
                conversation_id=request.conversation_id,
                content=full_response
            )
            
            # Kirim sinyal "selesai" yang jelas ke frontend
            yield f"data: {json.dumps({'type': 'done', 'full_content': full_response})}\n\n"
            
        except asyncio.CancelledError:
            # Koneksi diputus paksa — tetap simpan apa yang sudah ada
            if full_response:
                await save_partial_response(
                    conversation_id=request.conversation_id,
                    content=full_response,
                    is_complete=False
                )
        except Exception as e:
            # Error LLM atau lainnya — kirim error event ke frontend
            yield f"data: {json.dumps({'type': 'error', 'code': 'LLM_ERROR', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_with_heartbeat(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # ✅ Matikan Nginx buffering!
            "Access-Control-Allow-Origin": "*",
        }
    )
```

---

### ✅ SOLUSI 2: Perbaiki Nginx Config — Matikan Buffering

Kalau kamu pakai Nginx sebagai reverse proxy, ini **wajib** ditambahkan <sup data-citation="34"></sup>:

```nginx
# /etc/nginx/sites-available/chatbot
server {
    location /api/chat/stream {
        proxy_pass http://localhost:8000;
        
        # ✅ WAJIB untuk SSE/Streaming — matikan buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;     # 1 jam — cukup untuk streaming panjang
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        
        # ✅ Header yang diperlukan SSE
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_set_header X-Accel-Buffering no;
        
        # Chunked transfer encoding
        chunked_transfer_encoding on;
    }
    
    # Endpoint biasa (non-streaming) — timeout normal
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_read_timeout 60s;
    }
}
```

---

### ✅ SOLUSI 3: Perbaiki Next.js — Timeout + Proxy yang Benar

```typescript
// next.config.ts
const nextConfig = {
  compress: false, // ✅ Wajib! Kompresi bisa break SSE streaming
  
  async rewrites() {
    return [
      {
        source: '/api/chat/:path*',
        destination: `${process.env.BACKEND_URL}/api/chat/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

```typescript
// app/api/chat/stream/route.ts
// ✅ Set maxDuration agar tidak timeout
export const maxDuration = 60; // detik — sesuaikan dengan plan Vercel kamu
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // JANGAN gunakan 'edge' untuk stream panjang

export async function POST(req: Request) {
  const body = await req.json();
  
  // Forward ke Python backend
  const response = await fetch(`${process.env.BACKEND_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers.get('Authorization') || '',
    },
    body: JSON.stringify(body),
    // ✅ Tidak ada timeout di sini — biarkan maxDuration yang handle
  });
  
  // Forward streaming response langsung ke client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

### ✅ SOLUSI 4: Perbaiki Frontend — State Machine yang Cerdas

Ini inti dari masalah **fallback terpicu salah**. Kamu harus menggunakan **state machine** untuk membedakan kondisi koneksi:

```typescript
// hooks/useChat.ts

// ✅ State machine yang jelas — tidak semua error = tampilkan fallback
type StreamState = 
  | 'idle'           // Belum mulai
  | 'connecting'     // Sedang connect ke backend
  | 'streaming'      // Sedang menerima token
  | 'complete'       // Selesai sempurna
  | 'partial'        // Putus di tengah — ADA data masuk sebelumnya
  | 'error_no_connect'  // Gagal connect dari awal — BARU tampilkan fallback!
  | 'error_llm';     // LLM error dari backend

export function useChat() {
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [currentMessage, setCurrentMessage] = useState('');
  const [receivedTokens, setReceivedTokens] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const sendMessage = async (message: string, conversationId: string) => {
    // Reset state
    setStreamState('connecting');
    setCurrentMessage('');
    setReceivedTokens(0);
    
    // ✅ AbortController untuk cancel yang disengaja
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId }),
        signal: abortControllerRef.current.signal,
      });
      
      // ✅ Cek apakah koneksi berhasil dibuat
      if (!response.ok) {
        setStreamState('error_no_connect'); // ← Tampilkan fallback HANYA di sini
        return;
      }
      
      if (!response.body) {
        setStreamState('error_no_connect');
        return;
      }
      
      setStreamState('streaming'); // ← Koneksi berhasil!
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let tokenCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // ✅ Stream selesai — cek apakah sempurna atau partial
          if (streamState !== 'complete') {
            setStreamState(tokenCount > 0 ? 'partial' : 'error_no_connect');
          }
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const dataStr = line.replace('data: ', '').trim();
          if (!dataStr || dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            
            if (data.type === 'token') {
              setCurrentMessage(prev => prev + data.content);
              tokenCount++;
              setReceivedTokens(tokenCount);
              
            } else if (data.type === 'done') {
              // ✅ Backend konfirmasi selesai — state COMPLETE
              setStreamState('complete');
              
            } else if (data.type === 'error') {
              // ✅ Error dari LLM — bukan fallback, tapi pesan error yang informatif
              setStreamState('error_llm');
              console.error('LLM error:', data.message);
            }
            // Heartbeat comment ": heartbeat" diabaikan otomatis
            
          } catch (parseError) {
            // Parse error pada satu chunk — JANGAN interrupt, lanjutkan
            continue;
          }
        }
      }
      
    } catch (error: any) {
      // ✅ Bedakan error berdasarkan jenisnya
      if (error.name === 'AbortError') {
        // User sengaja cancel — ini BUKAN error, jangan tampilkan fallback
        setStreamState(receivedTokens > 0 ? 'partial' : 'idle');
        return;
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error — tidak bisa connect sama sekali
        setStreamState('error_no_connect'); // ← Tampilkan fallback di sini
        return;
      }
      
      // Error lain di tengah streaming — jika sudah ada token, jangan fallback
      setStreamState(receivedTokens > 0 ? 'partial' : 'error_no_connect');
    }
  };
  
  return { sendMessage, streamState, currentMessage, receivedTokens };
}
```

---

### ✅ SOLUSI 5: UI yang Responsif Berdasarkan State

Sekarang UI harus mencerminkan state machine di atas:

```tsx
// components/ChatMessage.tsx

function ChatMessage({ streamState, message, receivedTokens }: Props) {
  
  // ✅ Fallback HANYA tampil jika benar-benar tidak terhubung dari awal
  if (streamState === 'error_no_connect') {
    return (
      <div className="message error">
        <p>⚠️ Tidak dapat terhubung ke server. Silakan coba lagi.</p>
        <button onClick={retry}>Coba Lagi</button>
      </div>
    );
  }
  
  // ✅ Partial — ada data, tapi putus di tengah
  if (streamState === 'partial') {
    return (
      <div className="message partial">
        <p>{message}</p>
        <div className="warning-banner">
          ⚡ Respons terputus di tengah. 
          <button onClick={continueFromPartial}>Lanjutkan?</button>
        </div>
      </div>
    );
  }
  
  // ✅ Streaming — tampilkan token yang masuk + animasi
  if (streamState === 'streaming') {
    return (
      <div className="message streaming">
        <p>{message}<span className="cursor-blink">▊</span></p>
      </div>
    );
  }
  
  // ✅ Complete — tampilkan pesan final
  return <div className="message complete"><p>{message}</p></div>;
}
```

---

### ✅ SOLUSI 6: Reconnection dengan Exponential Backoff

Untuk koneksi yang putus karena network fluktuatif, implementasikan **auto-reconnect** <sup data-citation="1"></sup> <sup data-citation="4"></sup>:

```typescript
// utils/streamWithRetry.ts

export async function streamWithRetry(
  url: string,
  body: object,
  onToken: (token: string) => void,
  onComplete: () => void,
  maxRetries = 3
) {
  let attempt = 0;
  let lastTokenIndex = 0; // Track posisi terakhir untuk resume
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ 
          ...body, 
          resumeFrom: lastTokenIndex // ✅ Backend bisa resume dari posisi ini
        }),
      });
      
      // Proses stream...
      const reader = response.body!.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) { onComplete(); return; }
        
        const token = decode(value);
        lastTokenIndex++;
        onToken(token);
      }
      
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        throw new Error('Max retries exceeded');
      }
      
      // ✅ Exponential backoff: tunggu 1s, 2s, 4s, 8s sebelum retry
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retry ${attempt}/${maxRetries} dalam ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## BAGIAN 3: CHECKLIST DEBUGGING — Cek Satu Per Satu

Gunakan checklist ini untuk cari tahu di mana tepatnya masalahmu:

```
□ 1. Buka DevTools → Network tab
      → Cari request ke /api/chat/stream
      → Lihat statusnya: apakah 200? Atau 504/502?
      → Jika 504 = TIMEOUT (Pelaku #1 atau #2)
      → Jika 200 tapi stream berhenti = DISCONNECT di tengah (Pelaku #3/#5)

□ 2. Cek Python backend logs
      → Apakah ada "Client disconnected" di log?
      → Apakah ada error dari LLM API?
      → Berapa detik setelah start ia berhenti?

□ 3. Cek apakah pakai Vercel Hobby
      → Jika iya, batas 10 detik untuk serverless
      → Solusi: Gunakan 'nodejs' runtime + maxDuration

□ 4. Cek Nginx config
      → grep proxy_buffering /etc/nginx/sites-enabled/*
      → Jika tidak ada 'proxy_buffering off' = ini pelakunya

□ 5. Test langsung ke Python tanpa Next.js proxy
      → curl -N http://localhost:8000/api/chat/stream
      → Jika langsung ke Python berhasil tapi via Next.js tidak = masalah di proxy

□ 6. Lihat kapan persis fallback terpicu
      → Apakah sebelum token pertama masuk? (error_no_connect)
      → Atau setelah beberapa token? (partial disconnect)
      → Jawaban ini tentukan di mana fix-nya
```

---

## RANGKUMAN: Urutan Prioritas Perbaikan

Berdasarkan semua analisis, perbaiki **dalam urutan ini** dari yang paling sering jadi penyebab:

1. **Perbaiki error state machine di frontend** — pisahkan "gagal connect" vs "putus di tengah", jangan keduanya memicu fallback yang sama
2. **Matikan Nginx buffering** dengan `proxy_buffering off` dan tambahkan `X-Accel-Buffering: no` di header FastAPI
3. **Tambahkan heartbeat di FastAPI** setiap 15 detik agar koneksi tidak dianggap idle
4. **Set `maxDuration` dan `compress: false`** di Next.js config jika deploy di Vercel
5. **Handle `CancelledError` di FastAPI** agar partial response tetap tersimpan ke Supabase walau client disconnect
6. **Tambahkan retry dengan exponential backoff** di frontend sebagai safety net terakhir