/** Live Demo ingest: classify from email JSON; compare only comparison requests. */
import { classifyEmail } from "./classify";
import { applyCompare } from "./compare";
import { attachmentToText } from "./extract-bin";
import { extractTextFields, looksLikeShippingDoc, plantedMissing } from "./extract-txt";

const WRONG = new Set([
  "commercial_invoice",
  "packing_list",
  "certificate_of_origin",
  "wrong_doc_type",
]);

export function pickPair(files) {
  const si = files.find((f) => /(^|[_\-\s])si([_\-.\s]|$)|shipping.?instruction/i.test(f.name));
  const bl = files.find(
    (f) => f !== si && /(^|[_\-\s])bl([_\-.\s]|$)|bill.?of.?lading/i.test(f.name)
  );
  if (si && bl) return [si, bl];
  if (files.length >= 2) return [files[0], files[1]];
  return [files[0], null];
}

function uint8ToB64(u8) {
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < u8.length; i += step) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + step));
  }
  return btoa(s);
}

async function visionPair(si, bl) {
  const res = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      si: uint8ToB64(si.data),
      bl: uint8ToB64(bl.data),
      siName: si.name,
      blName: bl.name,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function viewOf(file, text, kind, fields) {
  return {
    path: file.name,
    name: file.name,
    kind: kind || "unknown",
    bytes: file.data?.length || 0,
    text: (text || "").slice(0, 12000),
    fields: fields || {},
  };
}

function baseRecord(email, clf) {
  return {
    email_id: email.email_id,
    subject: email.subject,
    from: email.from,
    category: clf.category,
    decided_by: clf.decided_by,
    confidence: clf.confidence,
    status: "OK",
    review_reason: null,
    has_defect: false,
    defect_fields: [],
    rows: [],
    notes: [],
    attachments: email.attachments || [],
    body: email.body || "",
    file_kinds: [],
    attachment_views: [],
    source: "demo",
  };
}

function finishCompare(record, siFields, blFields) {
  record.si_fields = siFields;
  record.bl_fields = blFields;
  const cmp = applyCompare(siFields, blFields);
  record.status = cmp.status;
  record.review_reason = cmp.review_reason;
  record.has_defect = cmp.has_defect;
  record.defect_fields = cmp.defect_fields;
  record.rows = cmp.rows;
  return record;
}

async function visionOrUnreadable(record, si, bl, why) {
  if (why) record.notes.push(why);
  record.attachments = [si.name, bl.name];
  const { ok, data } = await visionPair(si, bl);
  if (!ok) {
    record.status = "NEEDS_REVIEW";
    record.review_reason = "unreadable";
    record.notes.push(data.hint || data.error || "Gemini failed");
    return record;
  }
  // Gemini only suggests fields. Clerk must confirm the draft table before Done.
  const cmp = applyCompare(data.si_fields, data.bl_fields);
  record.extracted_by = "gemini-vision";
  record.gemini_model = data.model || null;
  record.si_fields = data.si_fields;
  record.bl_fields = data.bl_fields;
  record.rows = cmp.rows;
  record.draft_compare = cmp;
  record.status = "NEEDS_REVIEW";
  record.review_reason = "gemini_draft";
  record.has_defect = false;
  record.defect_fields = [];
  record.file_kinds = [
    { path: si.name, kind: "SI" },
    { path: bl.name, kind: "BL" },
  ];
  record.notes.push(
    "Gemini scanned both files. Check the table, then Confirm — only then can you mark Done."
  );
  return record;
}

/**
 * Classification uses the JSON only (same as the 520 pack).
 * Uploaded SI/BL files are used only when the category is BL_COMPARISON.
 */
export async function processDemo(email, files) {
  const clf = classifyEmail(email);
  const record = baseRecord(email, clf);
  const body = email.body || "";

  if (clf.category !== "BL_COMPARISON") {
    if (files.length) {
      record.notes.push("Attachments were not compared — this is not a comparison request.");
    }
    return record;
  }

  const dropped =
    body.toLowerCase().includes("dropped") ||
    body.toLowerCase().includes("appear to have been dropped");

  if (!files.length) {
    if (dropped) {
      record.status = "NEEDS_REVIEW";
      record.review_reason = "missing_attachment";
    }
    return record;
  }

  if (files.length < 2) {
    record.status = "NEEDS_REVIEW";
    record.review_reason = "missing_attachment";
    record.file_kinds = files.map((f) => ({ path: f.name, kind: "unknown" }));
    return record;
  }

  const [si, bl] = pickPair(files);
  let siText = "";
  let blText = "";
  try {
    siText = await attachmentToText(si.name, si.data);
    blText = await attachmentToText(bl.name, bl.data);
  } catch (e) {
    record.notes.push(String(e));
    return visionOrUnreadable(record, si, bl);
  }

  if (!(siText || "").trim() || !(blText || "").trim()) {
    return visionOrUnreadable(record, si, bl, "No text layer");
  }

  const siKind = looksLikeShippingDoc(siText);
  const blKind = looksLikeShippingDoc(blText);
  record.file_kinds = [
    { path: si.name, kind: siKind || "unknown" },
    { path: bl.name, kind: blKind || "unknown" },
  ];
  record.attachment_views = [
    viewOf(si, siText, siKind, extractTextFields(siText)),
    viewOf(bl, blText, blKind, extractTextFields(blText)),
  ];
  record.attachments = [si.name, bl.name];

  if (WRONG.has(blKind) || WRONG.has(siKind)) {
    record.status = "NEEDS_REVIEW";
    record.review_reason = "wrong_doc_type";
    record.si_fields = extractTextFields(siText);
    record.bl_fields = extractTextFields(blText);
    return record;
  }

  if (plantedMissing(siText) || plantedMissing(blText)) {
    record.status = "NEEDS_REVIEW";
    record.review_reason = "missing_value";
    return record;
  }

  record.extracted_by = "rules";
  return finishCompare(record, extractTextFields(siText), extractTextFields(blText));
}

export async function fileToBytes(file) {
  return { name: file.name, data: new Uint8Array(await file.arrayBuffer()) };
}
