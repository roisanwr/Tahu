"""
app/modules/geoscore/router.py — Geospatial Score Endpoint
POST /v1/sessions/{session_id}/geoscore → Hitung location score dari GPS
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBClient
from app.core.logging import get_logger
from app.modules.geoscore.overpass import query_location_data
from app.modules.scoring.engine import calc_L1, calc_L2, calc_L3, calc_S_location
from app.modules.scoring.validators import validate_gps

logger = get_logger(__name__)
router = APIRouter(tags=["Geoscore"])


class GeoscoreRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    manual_lat: float | None = None
    manual_lon: float | None = None
    address: str | None = None


class GeoscoreResponse(BaseModel):
    location_score: int
    market_proximity_score: int
    business_density_score: int
    infrastructure_score: int
    market_nearest_name: str | None
    market_distance_km: float | None
    business_count_500m: int
    gps_plausibility_score: float
    data_source: str


@router.post("/{session_id}/geoscore", response_model=GeoscoreResponse, status_code=201)
async def calculate_geoscore(
    session_id: str,
    body: GeoscoreRequest,
    user: CurrentUser,
    db: DBClient,
) -> GeoscoreResponse:
    """Hitung geospatial score dari koordinat GPS atau alamat manual."""
    # Verify session
    session_result = (
        db.table("sessions")
        .select("*, business_profiles!inner(user_id)")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Sesi tidak ditemukan"})
    if session_result.data["business_profiles"]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Bukan sesimu"})

    # Validate GPS
    gps_check = validate_gps(body.latitude, body.longitude, body.manual_lat, body.manual_lon)
    data_source = "gps_device" if body.latitude else "text_manual"

    # Use device GPS jika ada, otherwise manual
    lat = body.latitude or body.manual_lat
    lon = body.longitude or body.manual_lon

    # Determine gps source
    if body.latitude and body.manual_lat:
        gps_source = "auto_device"
    elif body.latitude:
        gps_source = "auto_device"
    elif body.manual_lat:
        gps_source = "manual_pin"
    else:
        gps_source = "text_only" if body.address else "none"

    # Query OSM Overpass untuk data sekitar
    osm_data = {}
    if lat and lon:
        try:
            osm_data = await query_location_data(lat, lon)
        except Exception as exc:
            logger.warning("overpass_query_failed", error=str(exc), lat=lat, lon=lon)
            osm_data = {"market_distance_km": 5.0, "business_count_500m": 0, "road_type": "other", "road_access": False, "bank_nearby": False}

    # Calculate scores
    L1 = calc_L1(osm_data.get("market_distance_km", 5.0))
    L2 = calc_L2(osm_data.get("business_count_500m", 0))
    L3 = calc_L3(osm_data.get("road_type", "other"), osm_data.get("road_access", False), osm_data.get("bank_nearby", False))
    L_total = calc_S_location(L1, L2, L3)

    # Save to geospatial_scores
    geo_data = {
        "session_id": session_id,
        "location_score": int(round(L_total)),
        "market_proximity_score": int(round(L1)),
        "business_density_score": int(round(L2)),
        "infrastructure_score": int(round(L3)),
        "market_nearest_name": osm_data.get("market_nearest_name"),
        "market_distance_km": osm_data.get("market_distance_km"),
        "business_count_500m": osm_data.get("business_count_500m", 0),
        "road_access": osm_data.get("road_access", False),
        "road_type": osm_data.get("road_type", "other"),
        "bank_nearby": osm_data.get("bank_nearby", False),
        "device_lat": body.latitude,
        "device_lon": body.longitude,
        "manual_lat": body.manual_lat,
        "manual_lon": body.manual_lon,
        "device_vs_pin_km": gps_check.get("device_vs_pin_km", 0.0),
        "gps_plausibility_score": gps_check.get("plausibility_score", 0.75),
        "raw_factors": osm_data,
    }

    db.table("geospatial_scores").upsert(geo_data, on_conflict="session_id").execute()

    # Update session GPS fields
    db.table("sessions").update({
        "gps_source": gps_source,
        "gps_plausibility_score": gps_check.get("plausibility_score", 0.75),
    }).eq("id", session_id).execute()

    # Update business_profiles location
    if lat and lon:
        import json
        db.table("business_profiles").update({
            "gps_verified": body.latitude is not None,
            "gps_verification_method": gps_source.replace("auto_", "").replace("_device", ""),
        }).eq("id", session_result.data["business_id"]).execute()

    return GeoscoreResponse(
        location_score=int(round(L_total)),
        market_proximity_score=int(round(L1)),
        business_density_score=int(round(L2)),
        infrastructure_score=int(round(L3)),
        market_nearest_name=osm_data.get("market_nearest_name"),
        market_distance_km=osm_data.get("market_distance_km"),
        business_count_500m=osm_data.get("business_count_500m", 0),
        gps_plausibility_score=gps_check.get("plausibility_score", 0.75),
        data_source=data_source,
    )
