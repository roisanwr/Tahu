"""
app/main.py — FastAPI Entrypoint (Modular Monolith V3.1)
"""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import RequestIDMiddleware, get_logger, setup_logging


# ── Logging setup diawal sebelum apapun ─────────────────────
setup_logging()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    settings = get_settings()

    logger.info(
        "app_startup",
        version=settings.app_version,
        env=settings.app_env,
        supabase_url=settings.supabase_url,
        azure_configured=settings.azure_configured,
    )

    # Warm up DB client singleton
    from app.infra.db.client import get_supabase_client
    get_supabase_client()

    yield

    logger.info("app_shutdown")


settings = get_settings()

app = FastAPI(
    title="TAHU — UMKM Credit Scoring API",
    version=settings.app_version,
    description="Backend API untuk platform penilaian kelayakan kredit UMKM Indonesia",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ──────────────────────────────────────
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    from app.core.logging import get_request_id
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(request_id=get_request_id()),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    from app.core.errors import InternalError
    from app.core.logging import get_request_id
    logger.error("unhandled_exception", error=str(exc), error_type=type(exc).__name__)
    err = InternalError(str(exc))
    return JSONResponse(
        status_code=500,
        content=err.to_dict(request_id=get_request_id()),
    )


# ── Routers ───────────────────────────────────────────────────
from app.modules.businesses.router import router as businesses_router
from app.modules.chat.router import router as chat_router
from app.modules.documents.router import router as documents_router
from app.modules.geoscore.router import router as geoscore_router
from app.modules.scoring.router import router as scoring_router
from app.modules.sessions.router import router as sessions_router

API_PREFIX = "/v1"

app.include_router(sessions_router, prefix=f"{API_PREFIX}/sessions")
app.include_router(businesses_router, prefix=f"{API_PREFIX}/businesses")
app.include_router(chat_router, prefix=f"{API_PREFIX}/sessions")
app.include_router(documents_router, prefix=f"{API_PREFIX}/sessions")
app.include_router(geoscore_router, prefix=f"{API_PREFIX}/sessions")
app.include_router(scoring_router, prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────
@app.get("/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "env": settings.app_env,
        "services": {
            "azure_ocr": "configured" if settings.azure_configured else "stub_mode",
        },
    }
