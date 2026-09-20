"""Rule-first classifier. Subject beats body; attachments imply comparison."""
import re


def _norm(s):
    return (s or "").replace("_", " ")


def classify_email(email):
    atts = email.get("attachments") or []
    subject = _norm(email.get("subject") or "")
    body = email.get("body") or ""
    subj_u = subject.upper()

    if atts:
        return {"category": "BL_COMPARISON", "decided_by": "rule", "confidence": 0.95}

    if _is_spam(subject, body):
        return {"category": "SPAM", "decided_by": "rule", "confidence": 0.92}

    if re.search(r"\bREQUEST SI\b|\bCUST SI\b|\bSI NEEDED\b|\bLATEST SI\b", subj_u):
        return {"category": "SI_REQUEST", "decided_by": "rule", "confidence": 0.95}
    if re.match(r"^(RE\s+)?SI\s+-", subj_u):
        return {"category": "SI_REQUEST", "decided_by": "rule", "confidence": 0.93}

    if re.search(r"TO CONFIRM DOCS|REQUEST BL DRAFT|\bDRAFT BL\b", subj_u):
        return {"category": "BL_COMPARISON", "decided_by": "rule", "confidence": 0.93}

    if re.search(
        r"CANCEL INVOICE|LOCAL CHARGES|D\s*&\s*D CHARGES|TOTAL FREIGHT|MISSING GR|RAK BILLING",
        subj_u,
    ):
        return {"category": "INVOICE_QUERY", "decided_by": "rule", "confidence": 0.93}

    if re.search(
        r"UPDATE SUMMARY|BERTHING REPORT|_?RPA_?|TIME OFF|NEW YEAR|"
        r"OUTSTANDING BL|PENDING BL RELEASE|DELIVERY PLANNING|MISS CONNECTION|"
        r"SUBMIT SI\s*&\s*AED|WELCOMING THE NEW YEAR",
        subj_u,
    ):
        return {"category": "GENERAL", "decided_by": "rule", "confidence": 0.9}

    if re.search(r"Please find Shipping instruction", body):
        return {"category": "SI_REQUEST", "decided_by": "rule", "confidence": 0.88}

    if re.search(
        r"send the draft BL|SI and draft BL|draft BL against the SI|"
        r"check the details and confirm|verify the BL matches the SI",
        body,
        re.I,
    ):
        return {"category": "BL_COMPARISON", "decided_by": "rule", "confidence": 0.85}

    if re.search(
        r"Query on invoice|cancel invoice|GR is still missing|D&D / detention|detention charges",
        body,
        re.I,
    ):
        return {"category": "INVOICE_QUERY", "decided_by": "rule", "confidence": 0.85}

    if re.search(r"RPA Bot|No action required|berthing report|update summary", body, re.I):
        return {"category": "GENERAL", "decided_by": "rule", "confidence": 0.8}

    return {"category": "GENERAL", "decided_by": "rule", "confidence": 0.45}


def _is_spam(subject, body):
    blob = (subject + "\n" + body).lower()
    needles = (
        "gift card",
        "claim now",
        "parcel is on hold",
        "unpaid customs",
        "storage is full",
        "mailbox has exceeded",
        "one weird trick",
        "hot singles",
        "bitcoin",
        "undelivered messages",
        "90% off",
        "bank details",
        "iphone",
        "bit.ly",
        "webmail-verify",
        "track-parcel",
        "free-iphone",
        "crypto-invest",
        "guaranteed 300%",
        "avoid suspension",
        "confirm payment of",
    )
    return any(n in blob for n in needles)
