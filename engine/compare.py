"""Code-only comparison of the seven shipment fields."""
import re
from normalize import container_count, is_blank, names_match, ports_match, weight_kg


def _garbled_name(value):
    return bool(re.search(r"[a-z][A-Z][a-z][A-Z]", value or ""))

FIELDS = (
    "shipper",
    "consignee",
    "notify_party",
    "port_of_loading",
    "port_of_discharge",
    "container_count",
    "gross_weight_kg",
)

WEIGHT_TOLERANCE_KG = 1.0


def _equal(field, si_val, bl_val):
    if field in ("shipper", "consignee", "notify_party"):
        if _garbled_name(si_val) or _garbled_name(bl_val):
            return True
        return names_match(si_val, bl_val)
    if field in ("port_of_loading", "port_of_discharge"):
        return ports_match(si_val, bl_val)
    if field == "container_count":
        a, b = container_count(si_val), container_count(bl_val)
        return a is not None and a == b
    if field == "gross_weight_kg":
        a, b = weight_kg(si_val), weight_kg(bl_val)
        if a is None or b is None:
            return False
        return abs(a - b) <= WEIGHT_TOLERANCE_KG
    return (si_val or "").strip().upper() == (bl_val or "").strip().upper()


def compare_fields(si, bl):
    defects = []
    rows = []
    uncertain = []
    for field in FIELDS:
        sv = si.get(field) or ""
        bv = bl.get(field) or ""
        if is_blank(sv) or is_blank(bv):
            uncertain.append(field)
            match = None
        else:
            match = _equal(field, sv, bv)
            if match is False:
                defects.append(field)
        rows.append({"field": field, "si": sv, "bl": bv, "match": match})

    if uncertain:
        status = "NEEDS_REVIEW"
        reason = "missing_value"
        has_defect = False
        defects = []
    elif defects:
        status = "MISMATCH"
        reason = None
        has_defect = True
    else:
        status = "OK"
        reason = None
        has_defect = False

    return {
        "status": status,
        "review_reason": reason,
        "has_defect": has_defect,
        "defect_fields": defects,
        "rows": rows,
    }
