"""Pull the seven comparison fields from document text (any source)."""
import re
from normalize import collapse_ws, is_blank

FIELD_ALIASES = {
    "shipper": [
        "shipper/exporter",
        "shipper (principal or seller)",
        "shipper",
    ],
    "consignee": [
        "consignee (non-negotiable)",
        "to the order of",
        "consignee",
    ],
    "notify_party": [
        "notify party/intermediate consignee",
        "notify party",
        "notify",
    ],
    "port_of_loading": [
        "port of loading (pol)",
        "port of loading",
        "load port",
        "pol",
    ],
    "port_of_discharge": [
        "port of discharge (pod)",
        "port of discharge",
        "discharge port",
        "pod",
    ],
    "container_count": [
        "no. of containers or packages",
        "no. of containers",
        "total containers",
        "container count",
    ],
    "gross_weight_kg": [
        "total gross weight",
        "total gross wt",
        "gross weight毛重(kgs)",
        "gross weight (kg)",
        "gross wt (kgs)",
        "gross weight",
        "gross wt",
        "gross weight毛重",
    ],
}

# longest alias first so "Notify Party" wins over "Notify"
for _k in FIELD_ALIASES:
    FIELD_ALIASES[_k] = sorted(FIELD_ALIASES[_k], key=len, reverse=True)


def extract_text_fields(text):
    text = text or ""
    text = re.sub(r"Weight\s*n+\s*\(", "Weight (", text)
    found = {}
    total_wt = re.search(
        r"(?im)total\s+gross\s+w(?:eigh)?t[^\n:]*[:：]\s*([\d,.]+(?:\s*KG)?)",
        text,
    )
    if total_wt:
        found["gross_weight_kg"] = collapse_ws(total_wt.group(1) + " KG")
    for field, aliases in FIELD_ALIASES.items():
        if field in found:
            continue
        for alias in aliases:
            val = _value_after_label(text, alias)
            if val:
                found[field] = val
                break
    return {k: found.get(k) for k in FIELD_ALIASES}


def _value_after_label(text, alias):
    esc = re.escape(alias)
    # Label: value   or   Label (中文): value
    pat = re.compile(
        r"(?im)^\s*(?:TOTAL\s+)?" + esc + r"(?:\s*[（(][^)）]+[)）])?\s*[:：]\s*(.+)$"
    )
    m = pat.search(text)
    if m:
        return collapse_ws(m.group(1))
    # Label<spaces>value on same line (PDF blocks)
    pat2 = re.compile(
        r"(?im)^\s*(?:TOTAL\s+)?" + esc + r"(?:\s*[（(][^)）]+[)）])?\s+(.+)$"
    )
    m = pat2.search(text)
    if m:
        return collapse_ws(m.group(1))
    return None


def looks_like_shipping_doc(text):
    head = (text or "")[:1200].upper()
    if "COMMERCIAL INVOICE" in head:
        return "commercial_invoice"
    if "PACKING LIST" in head:
        return "packing_list"
    if "CERTIFICATE OF ORIGIN" in head:
        return "certificate_of_origin"
    if "BILL OF LADING" in head or "BL INSTRUCTION" in head:
        return "BL" if "BILL OF LADING" in head else "SI"
    if "SHIPPING INSTRUCTION" in head:
        return "SI"
    return None


def planted_missing(text):
    return bool(re.search(r"\?\?\?|_{4,}|\bTBA\b|\bTBD\b", text or "", re.I))


def missing_required(fields):
    required = (
        "shipper",
        "consignee",
        "port_of_loading",
        "port_of_discharge",
        "container_count",
        "gross_weight_kg",
    )
    return any(is_blank(fields.get(k) or "") for k in required)
