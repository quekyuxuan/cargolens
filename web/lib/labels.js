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
  BL_COMPARISON: "Comparison request",
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

export function displayStatus(status) {
  if (status === "NEEDS_REVIEW") return "Pending";
  return status;
}

export function summarize(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const open = list.filter((r) => !r.reviewed);
  const compare = open.filter((r) => r.category === "BL_COMPARISON");
  return {
    total: open.length,
    compare_ok: compare.filter((r) => r.status === "OK").length,
    mismatch: open.filter((r) => r.status === "MISMATCH").length,
    pending: open.filter((r) => r.status === "NEEDS_REVIEW").length,
    other: open.filter((r) => r.category !== "BL_COMPARISON").length,
    reviewed: list.filter((r) => r.reviewed === true).length,
  };
}
