export const STORAGE_KEY = "cargolens-overrides";

export function loadOverrides() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

export function saveOverride(id, patch) {
  const all = loadOverrides();
  all[id] = { ...(all[id] || {}), ...patch, at: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all[id];
}

export function mergeRecord(rec, override) {
  if (!override) return rec;
  return { ...rec, ...override, engine_status: rec.status };
}

export const KIND_LABELS = {
  SI: "Shipping instruction",
  BL: "Draft bill of lading",
  commercial_invoice: "Commercial invoice",
  packing_list: "Packing list",
  certificate_of_origin: "Certificate of origin",
  wrong_doc_type: "Not an SI/BL",
  unknown: "Could not classify file",
};

export function mailtoResend(rec) {
  const to = rec.from || "";
  const subject = encodeURIComponent("Re: " + (rec.subject || rec.email_id) + " — please resend SI and draft BL");
  const body = encodeURIComponent(
    "Hi,\n\nWe received your document-check request (" +
      rec.email_id +
      ") but the SI/draft BL pair is incomplete or the attachments did not arrive.\n\nPlease reply with both files so we can compare and release.\n\nThanks,\nDocumentation"
  );
  return "mailto:" + to + "?subject=" + subject + "&body=" + body;
}
