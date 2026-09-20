"""Gemini vision extract. Used only when text extract fails. Does not decide mismatch."""
import json
import os
import urllib.request
from pathlib import Path

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

FIELDS = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)


def load_dotenv():
    path = Path(__file__).with_name(".env")
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def extract_fields_vision(filename, data, mime=None):
    load_dotenv()
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None, "GEMINI_API_KEY missing"
    import base64

    mime = mime or _mime(filename)
    b64 = base64.b64encode(data).decode("ascii")
    prompt = (
        "Read this shipping document. Return ONLY JSON with keys: "
        + ", ".join(FIELDS)
        + ". Use null if a field is unreadable. Do not invent values."
    )
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ]
            }
        ],
        "generationConfig": {"temperature": 0},
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + MODEL
        + ":generateContent?key="
        + key
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read())
    except Exception as exc:
        return None, str(exc)
    text = (
        payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    fields, err = _parse_json_fields(text)
    return fields, err


def _parse_json_fields(text):
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        raw = json.loads(text[start:end])
    except Exception:
        return None, "vision returned no JSON"
    out = {}
    filled = 0
    for key in FIELDS:
        val = raw.get(key)
        if val is None or str(val).strip() in {"", "null", "None"}:
            out[key] = None
        else:
            out[key] = str(val).strip()
            filled += 1
    if filled < 3:
        return out, "vision too uncertain"
    return out, None


def _mime(name):
    lower = (name or "").lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".webp"):
        return "image/webp"
    return "application/pdf"
