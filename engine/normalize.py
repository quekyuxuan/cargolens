"""Deterministic field normalisation. No LLM."""
import re

LEGAL_SUFFIXES = (
    r"\b(sdn\.?\s*bhd\.?|pte\.?\s*ltd\.?|co\.?,?\s*ltd\.?|limited|"
    r"llc|fz-?llc|fze|gmbh|inc\.?|corp\.?|corporation|ltd\.?|bhd\.?|sdn\.?)\b"
)

EXACT_BLANKS = {"???", "tba", "tbd", "n/a", "na", "nil", "unknown", ""}


def collapse_ws(value):
    return re.sub(r"\s+", " ", (value or "").replace("\xa0", " ")).strip()


def is_blank(value):
    v = collapse_ws(value).lower().strip(".:- ")
    if not v:
        return True
    compact = v.replace(" ", "")
    if compact in {"???", "______", "_____", "____", "___"}:
        return True
    if compact and set(compact) <= set("_?.-"):
        return True
    return v in EXACT_BLANKS


def company_key(value):
    v = collapse_ws(value).upper()
    v = re.sub(LEGAL_SUFFIXES, "", v, flags=re.I)
    v = re.sub(r"[^A-Z0-9 ]+", " ", v)
    return collapse_ws(v)


def port_code(value):
    v = collapse_ws(value).upper()
    codes = re.findall(r"\(([A-Z]{3,5})\)", v)
    return codes[-1] if codes else None


def port_key(value):
    """City/place name, ignoring a trailing UN/LOCODE in parentheses.

    The dataset sometimes plants a different city while keeping the same
    code, so comparing codes alone misses real mismatches.
    """
    v = collapse_ws(value).upper()
    v = re.sub(r"\(([A-Z]{3,5})\)\s*$", "", v).strip()
    first = v.split(",")[0]
    first = re.sub(r"\([^)]*\)", " ", first)
    return collapse_ws(re.sub(r"[^A-Z0-9 ]+", " ", first))


def ports_match(a, b):
    if is_blank(a) or is_blank(b):
        return False
    ka, kb = port_key(a), port_key(b)
    if ka and kb:
        if ka == kb or ka in kb or kb in ka:
            return True
        return False
    ca, cb = port_code(a), port_code(b)
    return bool(ca) and ca == cb


def container_count(value):
    v = collapse_ws(value)
    if is_blank(v):
        return None
    m = re.search(r"(\d+)\s*[xX]", v)
    if m:
        return int(m.group(1))
    m = re.search(r"\d+", v.replace(",", ""))
    return int(m.group(0)) if m else None


def weight_kg(value):
    v = collapse_ws(value)
    if is_blank(v):
        return None
    lower = v.lower()
    m = re.search(r"([\d,.]+)", v.replace(" ", ""))
    if not m:
        m = re.search(r"([\d,.]+)", v)
    if not m:
        return None
    num = float(m.group(1).replace(",", ""))
    if "lb" in lower or "pound" in lower:
        num *= 0.453592
    elif re.search(r"\bmt\b|metric ton|tonne", lower):
        num *= 1000
    return round(num, 3)


def names_match(a, b):
    if is_blank(a) or is_blank(b):
        return False
    ka, kb = company_key(a), company_key(b)
    if not ka or not kb:
        return False
    if ka == kb:
        return True
    leftover = None
    if ka in kb:
        leftover = collapse_ws(kb.replace(ka, " "))
    elif kb in ka:
        leftover = collapse_ws(ka.replace(kb, " "))
    else:
        return False
    # Distinct legal entities that share a prefix (e.g. APRIL ... vs APRIL ... MIDDLE EAST)
    if leftover in {"MIDDLE EAST", "FAR EAST"} or leftover.startswith("MIDDLE EAST"):
        return False
    return True
