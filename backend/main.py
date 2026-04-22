"""
main.py — UMKM Credit Scoring Platform — FastAPI Backend
=========================================================

Tech Stack : FastAPI + Uvicorn
Database   : Supabase (PostgreSQL 15 + PostGIS)
AI         : Gemini 1.5 Flash + Azure Document Intelligence
Deploy     : Render.com / Koyeb

Run locally:
    uvicorn main:app --reload --port 8000

Swagger UI (development):
    http://localhost:8000/docs
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import chat, documents, geoscore, scoring, sessions

load_dotenv()

# ─────────────────────────────────────────────────────────────
# App Instance
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Tahu — UMKM Credit Scoring API",
    description=(
        "Platform kredit scoring UMKM berbasis AI conversational interview. "
        "Menggunakan Gemini API untuk wawancara dan Azure OCR untuk analisis dokumen."
    ),
    version=os.getenv("APP_VERSION", "0.1.0"),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────────
# CORS Middleware
# ─────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# Global Exception Handler
# ─────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "code": "INTERNAL_ERROR",
            "message": "Terjadi kesalahan pada server",
            "details": {"type": type(exc).__name__},
        },
    )


# ─────────────────────────────────────────────────────────────
# Routers — prefix /v1 sesuai API_SPEC.md
# ─────────────────────────────────────────────────────────────
API_PREFIX = "/v1"

app.include_router(sessions.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
app.include_router(geoscore.router, prefix=API_PREFIX)
app.include_router(scoring.router, prefix=API_PREFIX)

# ─────────────────────────────────────────────────────────────
# Health Check — GET /v1/health
# ─────────────────────────────────────────────────────────────
@app.get(
    f"{API_PREFIX}/health",
    tags=["Health"],
    summary="Health check endpoint",
    response_description="Server status dan versi",
)
async def health_check() -> dict:
    """
    Verifikasi bahwa server berjalan dengan benar.
    Digunakan oleh Render health check dan cron-job.org keep-alive ping.
    """
    return {
        "status": "ok",
        "version": os.getenv("APP_VERSION", "0.1.0"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.getenv("APP_ENV", "development"),
    }


# ─────────────────────────────────────────────────────────────
# Root redirect
# ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": "Tahu API — lihat /docs untuk dokumentasi"}
