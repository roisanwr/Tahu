"""
app/modules/geoscore/overpass.py — OpenStreetMap Overpass API Client
Query data sekitar GPS location: pasar, toko, jalan, bank.
"""
from __future__ import annotations

import httpx


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TIMEOUT = 15


async def query_location_data(lat: float, lon: float, radius_m: int = 500) -> dict:
    """
    Query OSM Overpass API untuk data sekitar titik GPS.
    Returns dict dengan: market_distance_km, business_count_500m,
                         road_type, road_access, bank_nearby, market_nearest_name
    """
    # Overpass QL query
    query = f"""
[out:json][timeout:10];
(
  node["shop"](around:{radius_m},{lat},{lon});
  node["amenity"="marketplace"](around:2000,{lat},{lon});
  node["amenity"="bank"](around:1000,{lat},{lon});
  way["highway"](around:200,{lat},{lon});
);
out body;
"""

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        # Return defaults jika OSM tidak bisa diakses
        return {
            "market_distance_km": 5.0,
            "business_count_500m": 0,
            "road_type": "other",
            "road_access": False,
            "bank_nearby": False,
            "market_nearest_name": None,
        }

    elements = data.get("elements", [])

    # Count businesses
    business_count = sum(
        1 for e in elements
        if e.get("type") == "node" and "shop" in e.get("tags", {})
    )

    # Find nearest market/pasar
    market_distance_km = 5.0
    market_name = None
    for e in elements:
        tags = e.get("tags", {})
        if tags.get("amenity") == "marketplace":
            from app.modules.scoring.validators import haversine_km
            dist = haversine_km(lat, lon, e.get("lat", lat), e.get("lon", lon))
            if dist < market_distance_km:
                market_distance_km = dist
                market_name = tags.get("name")

    # Bank nearby
    bank_nearby = any(
        e.get("tags", {}).get("amenity") == "bank"
        for e in elements
        if e.get("type") == "node"
    )

    # Road type
    road_type = "other"
    road_access = False
    road_priority = ["trunk", "primary", "secondary", "residential"]
    for e in elements:
        if e.get("type") == "way" and "highway" in e.get("tags", {}):
            hw = e["tags"]["highway"]
            road_access = True
            if hw in road_priority:
                curr_idx = road_priority.index(road_type) if road_type in road_priority else 999
                new_idx = road_priority.index(hw)
                if new_idx < curr_idx:
                    road_type = hw

    return {
        "market_distance_km": round(market_distance_km, 3),
        "business_count_500m": business_count,
        "road_type": road_type,
        "road_access": road_access,
        "bank_nearby": bank_nearby,
        "market_nearest_name": market_name,
    }
