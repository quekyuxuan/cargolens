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

export function exportClerkState() {
  return JSON.stringify(
    {
      kind: "cargolens-clerk-state",
      exported_at: new Date().toISOString(),
      overrides: loadOverrides(),
      live_mail: JSON.parse(localStorage.getItem("cargolens-live-mail") || "[]"),
    },
    null,
    2
  );
}

export function importClerkState(text) {
  const parsed = JSON.parse(text);
  if (parsed.kind !== "cargolens-clerk-state") {
    throw new Error("Not a CargoLens handover file");
  }
  const merged = { ...loadOverrides() };
  for (const [id, ov] of Object.entries(parsed.overrides || {})) {
    const mine = merged[id];
    // Last decision wins, so two clerks can merge files in any order.
    if (!mine || !mine.at || (ov.at && ov.at > mine.at)) merged[id] = ov;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  const live = JSON.parse(localStorage.getItem("cargolens-live-mail") || "[]");
  const byId = {};
  for (const r of live) byId[r.email_id] = r;
  for (const r of parsed.live_mail || []) byId[r.email_id] = r;
  localStorage.setItem("cargolens-live-mail", JSON.stringify(Object.values(byId)));

  return Object.keys(merged).length;
}

export function clearClerkLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("cargolens-live-mail");
  localStorage.removeItem("cargolens-review");
  try {
    sessionStorage.removeItem("cargolens-graph-token");
    sessionStorage.removeItem("cargolens-pkce");
  } catch (e) {
    /* ignore */
  }
}

export function mergeRecord(rec, override) {
  if (!override) return rec;
  return { ...rec, ...override, engine_status: rec.status };
}

export const KIND_LABELS = {
  SI: "Shipping instruction",
  BL: "Bill of lading",
  commercial_invoice: "Commercial invoice",
  packing_list: "Packing list",
  certificate_of_origin: "Certificate of origin",
  wrong_doc_type: "Not an SI/BL",
  unknown: "Could not classify file",
};

export function mailtoResend(rec) {
  const to = rec.from || "";
  const subject = encodeURIComponent("Re: " + (rec.subject || rec.email_id) + " — please send SI and bill of lading");
  const body = encodeURIComponent(
    "Hi,\n\nWe received your comparison request (" +
      rec.email_id +
      ") but the SI / bill of lading pair is incomplete or the wrong document type arrived.\n\nPlease reply with both files so we can compare.\n\nThanks,\nDocumentation"
  );
  return "mailto:" + to + "?subject=" + subject + "&body=" + body;
}
