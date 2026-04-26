"""
app/modules/chat/sanitizer.py — Input Sanitization (Anti-Injection)
"""
from __future__ import annotations

import re
import unicodedata


# Pola injection yang harus diblokir
_INJECTION_PATTERNS = [
    r"ignore\s+previous\s+instructions",
    r"disregard\s+all\s+previous",
    r"you\s+are\s+now\s+(dan|jailbreak|anything)",
    r"act\s+as\s+(if\s+you\s+)?a.{0,30}without\s+restrictions",
    r"system\s*:",
    r"<\|.*?\|>",       # OpenAI legacy format
    r"\[INST\]",        # Llama format
    r"<<<.*?>>>",
]

_INJECTION_RE = re.compile(
    "|".join(_INJECTION_PATTERNS),
    re.IGNORECASE | re.DOTALL,
)

MAX_TOKENS = 4000   # ~4000 karakter approximation


def sanitize_user_input(text: str) -> tuple[str, bool]:
    """
    Sanitize user input sebelum dikirim ke LLM.
    
    Returns:
      (sanitized_text, injection_detected)
    """
    if not text:
        return "", False

    # Normalize unicode
    text = unicodedata.normalize("NFKC", text)

    # Strip control characters (kecuali newline dan tab)
    text = "".join(
        ch for ch in text
        if unicodedata.category(ch)[0] != "C" or ch in ("\n", "\t", "\r")
    )

    # Check injection
    injection_detected = bool(_INJECTION_RE.search(text))

    if injection_detected:
        # Hapus injection patterns tapi jangan crash
        text = _INJECTION_RE.sub("[...]", text)

    # Truncate ke max tokens
    if len(text) > MAX_TOKENS:
        text = text[:MAX_TOKENS] + "...[pesan dipotong karena terlalu panjang]"

    return text.strip(), injection_detected
