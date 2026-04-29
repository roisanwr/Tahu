import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from app.core.logging import RequestIDMiddleware

app = FastAPI()
app.add_middleware(RequestIDMiddleware)

@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    print("Executing unhandled_error_handler")
    return JSONResponse(status_code=500, content={"error": str(exc)})

@app.get("/test")
async def test():
    raise APIError({"message": "test", "code": "123", "hint": None, "details": None})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
