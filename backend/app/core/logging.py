"""
app/core/logging.py — Structured JSON Logging + Request ID Middleware
Setiap request punya unique request_id yang bisa di-trace di log.
"""
from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ── Context var untuk request_id ─────────────────────────────
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    return request_id_var.get("")


def setup_logging(level: str = "INFO") -> None:
    """Konfigurasi structlog dengan JSON renderer untuk production."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    return structlog.get_logger(name)


class RequestIDMiddleware:
    """Injects unique request_id ke setiap request untuk correlation logging (Pure ASGI)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Ambil request_id dari header atau generate baru
        req_id = ""
        for name, value in scope.get("headers", []):
            if name.lower() == b"x-request-id":
                req_id = value.decode("latin1")
                break
        
        if not req_id:
            req_id = str(uuid.uuid4())[:8]

        token = request_id_var.set(req_id)

        # Bind to structlog context
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=req_id,
            method=scope.get("method", ""),
            path=scope.get("path", ""),
        )

        logger = get_logger("http")
        start = time.perf_counter()

        status_code = 500

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
                # Attach X-Request-ID
                headers = message.setdefault("headers", [])
                headers.append((b"x-request-id", req_id.encode("latin1")))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "request_completed",
                status_code=status_code,
                duration_ms=round(duration_ms, 2),
            )
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "request_failed",
                error=str(exc),
                error_type=type(exc).__name__,
                duration_ms=round(duration_ms, 2),
            )
            raise
        finally:
            request_id_var.reset(token)
