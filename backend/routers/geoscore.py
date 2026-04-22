"""
routers/geoscore.py — Geospatial Scoring Endpoint

POST /v1/geoscore → Hitung skor lokasi usaha berdasarkan koordinat GPS
"""
from __future__ import annotations

import math
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from database import get_supabase
from models.schemas import GeoFactorDetail, GeoScoreRequest, GeoScoreResponse

router = APIRouter(prefix="/geoscore", tags=["Geospatial"])


def _stub_geoscore(lat: float, lng: float) -> dict:
    """
    Placeholder scoring logic.
    Day 5: ganti dengan Overpass API + Nominatim geocoding.
    """
    # Stub deterministic berdasarkan koordinat
    seed = (abs(lat) + abs(lng)) % 100
    market_score = int(50 + seed * 0.4) % 100
    density_score = int(40 + seed * 0.6) % 100
    infra_score = int(60 + seed * 0.3) % 100

    location_score = int(
        market_score * 0.40 + density_score * 0.35 + infra_score * 0.25
    )

    return {
        "location_score": location_score,
        "market_proximity": {
            "score": market_score,
            "nearest": "[Stub — aktif Day 5]",
            "distance_km": round(0.5 + (seed % 20) * 0.1, 1),
        },
        "business_density": {
            "score": density_score,
            "count_500m": int(10 + seed * 0.5),
        },
        "infrastructure": {
            "score": infra_score,
            "road_access": infra_score > 40,
            "bank_nearby": infra_score > 55,
        },
    }


@router.post(
    "",
    response_model=GeoScoreResponse,
    summary="Hitung skor lokasi usaha (geospatial scoring)",
)
async def calculate_geoscore(
    body: GeoScoreRequest,
    db: Client = Depends(get_supabase),
) -> GeoScoreResponse:
    """
    Terima koordinat GPS, hitung skor lokasi (0–100),
    simpan ke tabel geospatial_scores.
    
    Full Overpass API integration: Day 5.
    """
    # Hitung skor (stub hingga Day 5)
    scores = _stub_geoscore(body.latitude, body.longitude)

    # Update business_profiles dengan koordinat (location_point)
    # Menggunakan PostGIS POINT format
    try:
        db.table("business_profiles").upsert(
            {
                "session_id": str(body.session_id),
                "location_address": body.address,
                # PostGIS point via raw SQL saat Day 5
                # Untuk sekarang simpan via address saja
            },
            on_conflict="session_id",
        ).execute()
    except Exception:
        pass  # Jika business_profile belum ada, skip

    # Simpan ke geospatial_scores
    geo_id = str(uuid4())
    db.table("geospatial_scores").upsert(
        {
            "id": geo_id,
            "session_id": str(body.session_id),
            "location_score": scores["location_score"],
            "market_proximity_score": scores["market_proximity"]["score"],
            "market_nearest_name": scores["market_proximity"]["nearest"],
            "market_distance_km": scores["market_proximity"]["distance_km"],
            "business_density_score": scores["business_density"]["score"],
            "business_count_500m": scores["business_density"]["count_500m"],
            "infrastructure_score": scores["infrastructure"]["score"],
            "road_access": scores["infrastructure"]["road_access"],
            "bank_nearby": scores["infrastructure"]["bank_nearby"],
            "raw_factors": {
                "source": "stub",
                "lat": body.latitude,
                "lng": body.longitude,
            },
        },
        on_conflict="session_id",
    ).execute()

    return GeoScoreResponse(
        location_score=scores["location_score"],
        factors={
            "market_proximity": GeoFactorDetail(**scores["market_proximity"]),
            "business_density": GeoFactorDetail(**scores["business_density"]),
            "infrastructure": GeoFactorDetail(**scores["infrastructure"]),
        },
        coordinates={"lat": body.latitude, "lng": body.longitude},
    )
