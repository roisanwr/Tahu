import sys
from google import genai

client = genai.Client(api_key='AIzaSyDhbtfGKgQheoQq5p-WX3tjyP52DE0gFXo')

for model in ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']:
    print(f"Testing {model}...")
    try:
        response = client.models.generate_content(
            model=model,
            contents='Halo, jawab hanya dengan: OK',
            config={'max_output_tokens': 10}
        )
        print(f"SUKSES {model}: {response.text}")
    except Exception as e:
        print(f"ERROR {model}: {e}")
