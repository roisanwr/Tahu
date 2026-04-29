import asyncio
import uuid
import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError

# Fake structlog and contextvars for testing
class DummyLogger:
    def info(self, *args, **kwargs): print("INFO", args, kwargs)
    def error(self, *args, **kwargs): print("ERROR", args, kwargs)

class PureASGIMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        req_id = "test-id"
        start = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
                headers = message.setdefault("headers", [])
                headers.append((b"x-request-id", req_id.encode("latin1")))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            duration_ms = (time.perf_counter() - start) * 1000
            print("request_completed", status_code, round(duration_ms, 2))
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            print("request_failed", type(exc).__name__)
            raise

app = FastAPI()
app.add_middleware(PureASGIMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    print("Executing unhandled_error_handler")
    return JSONResponse(status_code=500, content={"error": str(exc)})

@app.get("/test")
async def test():
    raise APIError({"message": "test", "code": "123", "hint": None, "details": None})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
