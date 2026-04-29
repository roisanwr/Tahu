import asyncio
import httpx

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000/v1") as client:
        # 1. Test fetching non-existent session
        res = await client.get("/sessions/e305ff57-5582-4ab8-a1e4-3453856d3dd1", headers={"Origin": "http://localhost:3000", "Authorization": "Bearer fake"})
        print("Status:", res.status_code)
        print("Headers:", res.headers)
        print("Body:", res.json())

if __name__ == "__main__":
    asyncio.run(main())
