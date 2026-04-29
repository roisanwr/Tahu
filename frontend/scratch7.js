fetch("http://127.0.0.1:8000/v1/sessions/e305ff57-5582-4ab8-a1e4-3453856d3dd1", {
    method: "GET",
    headers: {
        "Origin": "http://localhost:3000"
    }
}).then(res => {
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    return res.text();
}).then(console.log).catch(err => console.error("Fetch error:", err));
