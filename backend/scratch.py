import asyncio
from supabase import create_client
from app.core.config import get_settings

async def main():
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    
    print("Initial headers:", db.options.headers)
    print("Initial auth auth headers:", db.auth._headers)

    # Fake a valid or invalid token? Actually we don't need a valid token to see if it mutates
    try:
        db.auth.get_user("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud2p2enhsbGx1bHdjdG1scXVtIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NzcxNzg3NTcsImV4cCI6MjA5Mjc1NDc1N30.valid_fake_token")
    except Exception as e:
        print("get_user failed:", e)

    print("Headers after get_user:", db.options.headers)
    print("Auth headers after get_user:", db.auth._headers)
    
    # Try querying using the postgrest client
    # Is the postgrest client headers updated?
    print("Postgrest headers:", db.table("business_profiles").session.headers)

if __name__ == "__main__":
    asyncio.run(main())
