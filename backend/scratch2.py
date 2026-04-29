import asyncio
from app.core.config import get_settings
from supabase import create_client

async def main():
    settings = get_settings()
    db = create_client(settings.supabase_url, settings.supabase_service_role_key)
    # Create a mock user token or sign up a mock user to get a token
    res = db.auth.sign_up({"email": "test1@example.com", "password": "password123"})
    token = res.session.access_token
    print("Token:", token)
    
    # Try querying with postgrest via service_role client but with authenticated user token in auth header?
    import requests
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {token}"
    }
    r = requests.get(f"{settings.supabase_url}/rest/v1/business_profiles?select=*", headers=headers)
    print("Mixed headers:", r.json())
    
    # Try querying with postgrest using ONLY user token (this is standard authenticated access)
    headers2 = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}"
    }
    r2 = requests.get(f"{settings.supabase_url}/rest/v1/business_profiles?select=*", headers=headers2)
    print("Standard auth headers:", r2.json())

if __name__ == "__main__":
    asyncio.run(main())
