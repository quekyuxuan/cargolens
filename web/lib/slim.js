// List pages only need these fields. Bodies and extracted text stay on the mail page.
export function toSlim(rec) {
  return {
    email_id: rec.email_id,
    subject: rec.subject,
    from: rec.from,
    category: rec.category,
    status: rec.status,
    review_reason: rec.review_reason || null,
    defect_fields: rec.defect_fields || [],
  };
}

export function slimList(rows) {
  return (Array.isArray(rows) ? rows : []).map(toSlim);
}
