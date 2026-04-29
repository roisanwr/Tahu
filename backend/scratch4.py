import asyncio
from app.core.config import get_settings
from supabase import create_client
import requests

async def main():
    settings = get_settings()
    url = f"{settings.supabase_url}/rest/v1/"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}"
    }
    r = requests.get(url, headers=headers)
    schema = r.json()
    if "definitions" in schema and "user_profiles" in schema["definitions"]:
        print(schema["definitions"]["user_profiles"])
    else:
        print("user_profiles not found in schema")

if __name__ == "__main__":
    asyncio.run(main())
