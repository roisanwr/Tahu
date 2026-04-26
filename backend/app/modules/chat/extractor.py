"""
app/modules/chat/extractor.py — Dual Extractor (LLM + Regex)
Untuk cross-validate field yang diekstrak dari percakapan.
"""
from __future__ import annotations

import re
from typing import Any


# ── Regex patterns untuk field-field keuangan ─────────────────

_RP_PATTERN = re.compile(
    r"(?:rp\.?\s*|rupiah\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)\s*"
    r"(?:juta|jt|jt\.|ribu|rb|rb\.|k|miliar|m(?:iliar)?)?",
    re.IGNORECASE,
)


def _parse_rupiah(text: str) -> int | None:
    """Ekstrak angka Rupiah dari teks bebas."""
    matches = _RP_PATTERN.findall(text)
    if not matches:
        return None

    # Ambil yang pertama cocok
    raw = matches[0].replace(",", "").replace(".", "")
    try:
        val = int(raw)
    except ValueError:
        return None

    # Detect multiplier dari konteks
    tl = text.lower()
    if "miliar" in tl:
        val *= 1_000_000_000
    elif "juta" in tl or " jt" in tl:
        val *= 1_000_000
    elif "ribu" in tl or " rb" in tl:
        val *= 1_000

    return val


def _parse_bool(text: str, positive_terms: list[str], negative_terms: list[str]) -> bool | None:
    tl = text.lower()
    if any(t in tl for t in positive_terms):
        return True
    if any(t in tl for t in negative_terms):
        return False
    return None


# ── Main extractor ───────────────────────────────────────────

REGEX_EXTRACTORS: dict[str, Any] = {
    "monthly_revenue": lambda text: _parse_rupiah(text) if any(
        kw in text.lower() for kw in ["omzet", "pendapatan", "pemasukan", "revenue"]
    ) else None,
    "monthly_expense": lambda text: _parse_rupiah(text) if any(
        kw in text.lower() for kw in ["pengeluaran", "biaya", "ongkos", "expense"]
    ) else None,
    "assets_estimate": lambda text: _parse_rupiah(text) if any(
        kw in text.lower() for kw in ["aset", "modal", "kekayaan", "harta"]
    ) else None,
    "has_fixed_location": lambda text: _parse_bool(
        text,
        positive_terms=["toko tetap", "kios", "ruko", "warung", "tempat usaha"],
        negative_terms=["keliling", "tidak punya tempat", "online only"],
    ),
    "has_wa_business": lambda text: _parse_bool(
        text,
        positive_terms=["wa bisnis", "whatsapp bisnis", "whatsapp business"],
        negative_terms=["tidak punya wa bisnis", "pakai wa biasa"],
    ),
}


def regex_extract(field: str, text: str) -> Any:
    """Ekstrak satu field dari text menggunakan regex."""
    extractor = REGEX_EXTRACTORS.get(field)
    if extractor:
        try:
            return extractor(text)
        except Exception:
            return None
    return None


def accept_field(
    field_name: str,
    regex_value: Any,
    llm_value: Any,
    tolerance_pct: float = 20.0,
) -> dict[str, Any]:
    """
    Dual extractor agreement check.
    
    Rules:
    - Keduanya None → skip
    - Satu ada, satu None → accept yang ada dengan low confidence
    - Keduanya ada dan agree → accept dengan high confidence
    - Keduanya ada tapi berbeda > tolerance → flag discrepancy
    """
    if regex_value is None and llm_value is None:
        return {"value": None, "confidence": "none", "discrepancy": False}

    if regex_value is None:
        return {"value": llm_value, "confidence": "medium", "discrepancy": False}

    if llm_value is None:
        return {"value": regex_value, "confidence": "medium", "discrepancy": False}

    # Both present — check agreement
    if isinstance(regex_value, (int, float)) and isinstance(llm_value, (int, float)):
        if llm_value == 0:
            return {"value": regex_value, "confidence": "low", "discrepancy": True}
        delta_pct = abs(regex_value - llm_value) / max(abs(llm_value), 1) * 100
        if delta_pct <= tolerance_pct:
            return {"value": llm_value, "confidence": "high", "discrepancy": False}
        else:
            return {
                "value": llm_value,
                "confidence": "low",
                "discrepancy": True,
                "delta_pct": round(delta_pct, 1),
            }

    if isinstance(regex_value, bool) and isinstance(llm_value, bool):
        if regex_value == llm_value:
            return {"value": llm_value, "confidence": "high", "discrepancy": False}
        else:
            return {"value": llm_value, "confidence": "low", "discrepancy": True}

    # Different types → trust LLM
    return {"value": llm_value, "confidence": "medium", "discrepancy": False}


def detect_contradiction(
    field: str,
    old_value: Any,
    new_value: Any,
    threshold_pct: float = 30.0,
) -> bool:
    """
    Return True jika perubahan nilai field > threshold (untuk numerik).
    """
    if old_value is None or new_value is None:
        return False
    if old_value == new_value:
        return False
    if isinstance(old_value, (int, float)) and isinstance(new_value, (int, float)):
        if old_value == 0:
            return new_value > 0
        delta = abs(new_value - old_value) / abs(old_value) * 100
        return delta > threshold_pct
    return False  # non-numeric changes are revisions, not contradictions
