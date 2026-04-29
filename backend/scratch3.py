import asyncio
from app.core.config import get_settings
from supabase import create_client

async def main():
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    res = db.table("user_profiles").select("*").limit(1).execute()
    print("User profiles:", res.data)
    
if __name__ == "__main__":
    asyncio.run(main())
