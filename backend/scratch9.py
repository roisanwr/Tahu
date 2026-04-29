import requests

try:
    res = requests.get("http://127.0.0.1:8000/v1/sessions/e305ff57-5582-4ab8-a1e4-3453856d3dd1", headers={"Origin": "http://localhost:3000", "Authorization": "Bearer fake"})
    print(res.status_code)
    print(res.headers)
except Exception as e:
    print("Error:", e)
