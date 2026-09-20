export const FIELDS = [
  "shipper",
  "consignee",
  "notify_party",
  "port_of_loading",
  "port_of_discharge",
  "container_count",
  "gross_weight_kg",
];

export function compareFields(si, bl) {
  const rows = [];
  const defects = [];
  for (const field of FIELDS) {
    const a = (si?.[field] || "").trim();
    const b = (bl?.[field] || "").trim();
    let match = null;
    if (a && b) {
      match = a.toUpperCase() === b.toUpperCase();
      if (!match) defects.push(field);
    }
    rows.push({ field, si: a, bl: b, match });
  }
  if (defects.length) {
    return { status: "MISMATCH", has_defect: true, defect_fields: defects, review_reason: null, rows };
  }
  return { status: "OK", has_defect: false, defect_fields: [], review_reason: null, rows };
}
