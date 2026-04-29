import requests

try:
    res = requests.post("http://127.0.0.1:8000/v1/businesses", headers={"Origin": "http://localhost:3000", "Authorization": "Bearer fake"})
    print(res.status_code)
    print(res.headers)
except Exception as e:
    print(e)
