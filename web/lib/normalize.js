/** Same as engine/normalize.py. */

const LEGAL_SUFFIXES =
  /\b(sdn\.?\s*bhd\.?|pte\.?\s*ltd\.?|co\.?,?\s*ltd\.?|limited|llc|fz-?llc|fze|gmbh|inc\.?|corp\.?|corporation|ltd\.?|bhd\.?|sdn\.?)\b/gi;

const EXACT_BLANKS = new Set(["???", "tba", "tbd", "n/a", "na", "nil", "unknown", ""]);

export function collapseWs(value) {
  return (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function isBlank(value) {
  const v = collapseWs(value).toLowerCase().replace(/^[.:\-\s]+|[.:\-\s]+$/g, "");
  if (!v) return true;
  const compact = v.replace(/ /g, "");
  if (["???", "______", "_____", "____", "___"].includes(compact)) return true;
  if (compact && /^[_\?.\-]+$/.test(compact)) return true;
  return EXACT_BLANKS.has(v);
}

export function companyKey(value) {
  let v = collapseWs(value).toUpperCase();
  v = v.replace(LEGAL_SUFFIXES, "");
  v = v.replace(/[^A-Z0-9 ]+/g, " ");
  return collapseWs(v);
}

export function portCode(value) {
  const v = collapseWs(value).toUpperCase();
  const codes = [...v.matchAll(/\(([A-Z]{3,5})\)/g)].map((m) => m[1]);
  return codes.length ? codes[codes.length - 1] : null;
}

export function portKey(value) {
  let v = collapseWs(value).toUpperCase();
  v = v.replace(/\(([A-Z]{3,5})\)\s*$/, "").trim();
  let first = v.split(",")[0];
  first = first.replace(/\([^)]*\)/g, " ");
  return collapseWs(first.replace(/[^A-Z0-9 ]+/g, " "));
}

export function portsMatch(a, b) {
  if (isBlank(a) || isBlank(b)) return false;
  const ka = portKey(a);
  const kb = portKey(b);
  if (ka && kb) {
    if (ka === kb || ka.includes(kb) || kb.includes(ka)) return true;
    return false;
  }
  const ca = portCode(a);
  const cb = portCode(b);
  return Boolean(ca) && ca === cb;
}

export function containerCount(value) {
  const v = collapseWs(value);
  if (isBlank(v)) return null;
  const x = v.match(/(\d+)\s*[xX]/);
  if (x) return parseInt(x[1], 10);
  const n = v.replace(/,/g, "").match(/\d+/);
  return n ? parseInt(n[0], 10) : null;
}

export function weightKg(value) {
  const v = collapseWs(value);
  if (isBlank(v)) return null;
  const lower = v.toLowerCase();
  let m = v.replace(/ /g, "").match(/([\d,.]+)/);
  if (!m) m = v.match(/([\d,.]+)/);
  if (!m) return null;
  let num = parseFloat(m[1].replace(/,/g, ""));
  if (lower.includes("lb") || lower.includes("pound")) num *= 0.453592;
  else if (/\bmt\b|metric ton|tonne/.test(lower)) num *= 1000;
  return Math.round(num * 1000) / 1000;
}

export function namesMatch(a, b) {
  if (isBlank(a) || isBlank(b)) return false;
  const ka = companyKey(a);
  const kb = companyKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  let leftover = null;
  if (kb.includes(ka)) leftover = collapseWs(kb.replace(ka, " "));
  else if (ka.includes(kb)) leftover = collapseWs(ka.replace(kb, " "));
  else return false;
  if (leftover === "MIDDLE EAST" || leftover === "FAR EAST" || leftover.startsWith("MIDDLE EAST")) {
    return false;
  }
  return true;
}
