import asyncio
from app.core.config import get_settings
from supabase import create_client

async def main():
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    try:
        res = db.table("sessions").select("*").eq("id", "e305ff57-5582-4ab8-a1e4-3453856d3dd1").single().execute()
        print("Success:", res)
    except Exception as e:
        print("Error type:", type(e))
        print("Error msg:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
