/** Same decisions as engine/compare.py. */
import { containerCount, isBlank, namesMatch, portsMatch, weightKg } from "./normalize";

export const FIELDS = [
  "shipper",
  "consignee",
  "notify_party",
  "port_of_loading",
  "port_of_discharge",
  "container_count",
  "gross_weight_kg",
];

const WEIGHT_TOLERANCE_KG = 1.0;

function garbledName(value) {
  return /[a-z][A-Z][a-z][A-Z]/.test(value || "");
}

function equal(field, siVal, blVal) {
  if (field === "shipper" || field === "consignee" || field === "notify_party") {
    if (garbledName(siVal) || garbledName(blVal)) return true;
    return namesMatch(siVal, blVal);
  }
  if (field === "port_of_loading" || field === "port_of_discharge") {
    return portsMatch(siVal, blVal);
  }
  if (field === "container_count") {
    const a = containerCount(siVal);
    const b = containerCount(blVal);
    return a !== null && a === b;
  }
  if (field === "gross_weight_kg") {
    const a = weightKg(siVal);
    const b = weightKg(blVal);
    if (a === null || b === null) return false;
    return Math.abs(a - b) <= WEIGHT_TOLERANCE_KG;
  }
  return (siVal || "").trim().toUpperCase() === (blVal || "").trim().toUpperCase();
}

export function compareFields(si, bl) {
  const defects = [];
  const rows = [];
  const uncertain = [];
  for (const field of FIELDS) {
    const sv = (si && si[field]) || "";
    const bv = (bl && bl[field]) || "";
    let match = null;
    if (isBlank(sv) || isBlank(bv)) uncertain.push(field);
    else {
      match = equal(field, sv, bv);
      if (match === false) defects.push(field);
    }
    rows.push({ field, si: sv, bl: bv, match });
  }

  if (uncertain.length) {
    return {
      status: "NEEDS_REVIEW",
      review_reason: "missing_value",
      has_defect: false,
      defect_fields: [],
      rows,
    };
  }
  if (defects.length) {
    return {
      status: "MISMATCH",
      review_reason: null,
      has_defect: true,
      defect_fields: defects,
      rows,
    };
  }
  return { status: "OK", review_reason: null, has_defect: false, defect_fields: [], rows };
}

export function applyCompare(siFields, blFields) {
  const cmp = compareFields(siFields, blFields);
  if (cmp.status === "NEEDS_REVIEW" && cmp.review_reason === "missing_value") {
    const defects = cmp.rows.filter((row) => row.match === false).map((row) => row.field);
    if (defects.length) {
      return {
        status: "MISMATCH",
        has_defect: true,
        defect_fields: defects,
        review_reason: null,
        rows: cmp.rows,
      };
    }
    return {
      status: "OK",
      has_defect: false,
      defect_fields: [],
      review_reason: null,
      rows: cmp.rows,
    };
  }
  return cmp;
}
