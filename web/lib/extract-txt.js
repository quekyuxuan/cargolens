import { collapseWs } from "./normalize";

export const FIELD_ALIASES = {
  shipper: ["shipper/exporter", "shipper (principal or seller)", "shipper"],
  consignee: ["consignee (non-negotiable)", "to the order of", "consignee"],
  notify_party: ["notify party/intermediate consignee", "notify party", "notify"],
  port_of_loading: ["port of loading (pol)", "port of loading", "load port", "pol"],
  port_of_discharge: ["port of discharge (pod)", "port of discharge", "discharge port", "pod"],
  container_count: [
    "no. of containers or packages",
    "no. of containers",
    "total containers",
    "container count",
  ],
  gross_weight_kg: [
    "total gross weight",
    "total gross wt",
    "gross weight毛重(kgs)",
    "gross weight (kg)",
    "gross wt (kgs)",
    "gross weight",
    "gross wt",
    "gross weight毛重",
  ],
};

for (const k of Object.keys(FIELD_ALIASES)) {
  FIELD_ALIASES[k] = [...FIELD_ALIASES[k]].sort((a, b) => b.length - a.length);
}

export const FIELDS = Object.keys(FIELD_ALIASES);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueAfterLabel(text, alias) {
  const esc = escapeRe(alias);
  const pat = new RegExp(
    "^\\s*(?:TOTAL\\s+)?" + esc + "(?:\\s*[（(][^)）]+[)）])?\\s*[:：]\\s*(.+)$",
    "im"
  );
  let m = pat.exec(text);
  if (m) return collapseWs(m[1]);
  const pat2 = new RegExp(
    "^\\s*(?:TOTAL\\s+)?" + esc + "(?:\\s*[（(][^)）]+[)）])?\\s+(.+)$",
    "im"
  );
  m = pat2.exec(text);
  return m ? collapseWs(m[1]) : null;
}

export function extractTextFields(text) {
  let t = text || "";
  t = t.replace(/Weight\s*n+\s*\(/g, "Weight (");
  const found = {};
  const totalWt = t.match(
    /(?:^|\n)[^\n]*total\s+gross\s+w(?:eigh)?t[^\n:]*[:：]\s*([\d,.]+(?:\s*KG)?)/i
  );
  if (totalWt) found.gross_weight_kg = collapseWs(totalWt[1] + " KG");
  for (const field of FIELDS) {
    if (found[field]) continue;
    for (const alias of FIELD_ALIASES[field]) {
      const val = valueAfterLabel(t, alias);
      if (val) {
        found[field] = val;
        break;
      }
    }
  }
  const out = {};
  for (const k of FIELDS) out[k] = found[k] || null;
  return out;
}

export function looksLikeShippingDoc(text) {
  const head = (text || "").slice(0, 1200).toUpperCase();
  if (head.includes("COMMERCIAL INVOICE")) return "commercial_invoice";
  if (head.includes("PACKING LIST")) return "packing_list";
  if (head.includes("CERTIFICATE OF ORIGIN")) return "certificate_of_origin";
  if (head.includes("BILL OF LADING")) return "BL";
  if (head.includes("BL INSTRUCTION")) return "SI";
  if (head.includes("SHIPPING INSTRUCTION")) return "SI";
  return null;
}

export function plantedMissing(text) {
  return /\?\?\?|_{4,}|\bTBA\b|\bTBD\b/i.test(text || "");
}
