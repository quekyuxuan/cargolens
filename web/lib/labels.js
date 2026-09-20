export const FIELD_LABELS = {
  shipper: "Shipper",
  consignee: "Consignee",
  notify_party: "Notify party",
  port_of_loading: "Port of loading",
  port_of_discharge: "Port of discharge",
  container_count: "Containers",
  gross_weight_kg: "Gross weight",
};

export const CAT_LABELS = {
  BL_COMPARISON: "Document check",
  SI_REQUEST: "New SI",
  INVOICE_QUERY: "Invoice",
  GENERAL: "General",
  SPAM: "Spam",
};

export function statusClass(status) {
  if (status === "MISMATCH") return "bad";
  if (status === "NEEDS_REVIEW") return "hold";
  return "ok";
}

export function summarize(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return {
    total: list.length,
    compare: list.filter((r) => r.category === "BL_COMPARISON").length,
    mismatch: list.filter((r) => r.status === "MISMATCH").length,
    review: list.filter((r) => r.status === "NEEDS_REVIEW").length,
  };
}
