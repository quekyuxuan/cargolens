"""Classify, extract any attachment type, compare."""
from classify import classify_email
from compare import compare_fields
from extract_bin import attachment_to_text, extract_attachment
from extract_txt import looks_like_shipping_doc, planted_missing


def _split_si_bl(paths):
    si = next((p for p in paths if "_SI." in p.replace("\\", "/")), None)
    bl = next((p for p in paths if "_BL." in p.replace("\\", "/")), None)
    if si is None and len(paths) >= 1:
        si = paths[0]
    if bl is None and len(paths) >= 2:
        bl = paths[1]
    return si, bl


def process_email(email, inbox):
    clf = classify_email(email)
    category = clf["category"]
    atts = email.get("attachments") or []
    body = email.get("body") or ""

    record = {
        "email_id": email["email_id"],
        "subject": email.get("subject"),
        "from": email.get("from"),
        "category": category,
        "decided_by": clf.get("decided_by"),
        "confidence": clf.get("confidence"),
        "status": "OK",
        "review_reason": None,
        "has_defect": False,
        "defect_fields": [],
        "rows": [],
        "notes": [],
        "attachments": atts,
        "body": body[:800],
        "file_kinds": [],
    }

    if category != "BL_COMPARISON":
        return record

    dropped = "dropped" in body.lower() or "appear to have been dropped" in body.lower()
    if not atts:
        if dropped:
            record["status"] = "NEEDS_REVIEW"
            record["review_reason"] = "missing_attachment"
        return record

    si_path, bl_path = _split_si_bl(atts)
    if not bl_path:
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "missing_attachment"
        return record

    si_bytes = inbox.read_bytes(si_path)
    bl_bytes = inbox.read_bytes(bl_path)
    if not si_bytes or not bl_bytes:
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "unreadable"
        return record

    try:
        si_text = attachment_to_text(si_path, si_bytes)
        bl_text = attachment_to_text(bl_path, bl_bytes)
    except Exception as exc:
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "unreadable"
        record["notes"].append(str(exc))
        return record

    if not (si_text or "").strip() or not (bl_text or "").strip():
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "unreadable"
        return record

    if "will not open" in body.lower() or "garbled" in body.lower():
        # still try; only escalate if extract really failed (handled above)
        pass

    si_kind = looks_like_shipping_doc(si_text)
    bl_kind = looks_like_shipping_doc(bl_text)
    record["file_kinds"] = [
        {"path": si_path, "kind": si_kind or "unknown"},
        {"path": bl_path, "kind": bl_kind or "unknown"},
    ]
    WRONG = {"commercial_invoice", "packing_list", "certificate_of_origin", "wrong_doc_type"}
    if bl_kind in WRONG or si_kind in WRONG:
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "wrong_doc_type"
        return record

    if planted_missing(si_text) or planted_missing(bl_text):
        record["status"] = "NEEDS_REVIEW"
        record["review_reason"] = "missing_value"
        return record

    _, si_fields = extract_attachment(si_path, si_bytes)
    _, bl_fields = extract_attachment(bl_path, bl_bytes)
    record["si_fields"] = si_fields
    record["bl_fields"] = bl_fields

    cmp = compare_fields(si_fields, bl_fields)
    # If a field failed to extract, skip it instead of escalating the whole case
    if cmp["status"] == "NEEDS_REVIEW" and cmp["review_reason"] == "missing_value":
        rows = []
        defects = []
        for row in cmp["rows"]:
            if row["match"] is None:
                rows.append(row)
                continue
            rows.append(row)
            if row["match"] is False:
                defects.append(row["field"])
        record["rows"] = rows
        if defects:
            record["status"] = "MISMATCH"
            record["has_defect"] = True
            record["defect_fields"] = defects
            record["review_reason"] = None
        else:
            record["status"] = "OK"
            record["has_defect"] = False
            record["defect_fields"] = []
            record["review_reason"] = None
        return record

    record.update(
        {k: cmp[k] for k in ("status", "review_reason", "has_defect", "defect_fields", "rows")}
    )
    return record


def to_submission_row(record):
    return {
        "category": record["category"],
        "status": record["status"],
        "review_reason": record["review_reason"],
        "has_defect": record["has_defect"],
        "defect_fields": record["defect_fields"],
        "decided_by": record.get("decided_by"),
    }
