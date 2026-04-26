"""
app/modules/documents/forensics.py — Document Forensics
EXIF extraction, perceptual hash, forgery score heuristic.
"""
from __future__ import annotations

import io
from typing import Any


async def analyze_document_forensics(
    image_bytes: bytes,
    db: Any,
    session_id: str,
) -> dict:
    """
    Analyze gambar untuk forensics.
    Returns dict dengan: image_phash, exif_meta, image_forgery_score,
                         has_exif, exif_plausible, duplicate_flag
    """
    result = {
        "image_phash": None,
        "exif_meta": None,
        "image_forgery_score": 0.0,
        "has_exif": False,
        "exif_plausible": True,
        "duplicate_flag": False,
    }

    try:
        from PIL import Image
        import imagehash

        img = Image.open(io.BytesIO(image_bytes))

        # ── pHash ────────────────────────────────────────────
        phash = str(imagehash.phash(img))
        result["image_phash"] = phash

        # ── Duplicate check via pHash ─────────────────────────
        existing = (
            db.table("documents")
            .select("id, session_id")
            .eq("image_phash", phash)
            .neq("session_id", session_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            result["duplicate_flag"] = True
            result["image_forgery_score"] = max(result["image_forgery_score"], 0.85)

        # ── EXIF extraction ───────────────────────────────────
        exif_data = {}
        try:
            import piexif
            exif_bytes = img.info.get("exif", b"")
            if exif_bytes:
                exif_dict = piexif.load(exif_bytes)
                has_exif = True

                # Extract GPS data
                gps = exif_dict.get("GPS", {})
                if gps:
                    exif_data["has_gps"] = True
                # Extract camera data
                img_ifd = exif_dict.get("0th", {})
                make = img_ifd.get(271, b"").decode("utf-8", errors="ignore")
                model_tag = img_ifd.get(272, b"").decode("utf-8", errors="ignore")
                if make or model_tag:
                    exif_data["camera"] = f"{make} {model_tag}".strip()
                # DateTime
                dt = img_ifd.get(306, b"").decode("utf-8", errors="ignore")
                if dt:
                    exif_data["datetime"] = dt

                result["has_exif"] = True
                result["exif_meta"] = exif_data
            else:
                has_exif = False
        except Exception:
            has_exif = False

        result["has_exif"] = has_exif

        # ── Forgery heuristics ───────────────────────────────
        forgery_score = 0.0

        # Screenshot without EXIF → moderate suspicion
        if not has_exif and img.size[0] in (750, 1080, 1920, 2560):
            forgery_score += 0.2

        # Very small image → suspicious
        if img.size[0] < 200 or img.size[1] < 200:
            forgery_score += 0.3

        # Duplicate photo from other session
        if result["duplicate_flag"]:
            forgery_score += 0.6

        result["image_forgery_score"] = min(forgery_score, 1.0)

    except ImportError:
        # PIL not installed — skip forensics gracefully
        result["image_forgery_score"] = 0.0
    except Exception:
        result["image_forgery_score"] = 0.0

    return result
