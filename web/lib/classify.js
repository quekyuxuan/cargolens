/** Same rules as engine/classify.py. JSON attachment names count; uploaded files do not reclassify. */

function norm(s) {
  return (s || "").replace(/_/g, " ");
}

const SPAM_NEEDLES = [
  "gift card",
  "claim now",
  "parcel is on hold",
  "unpaid customs",
  "storage is full",
  "mailbox has exceeded",
  "one weird trick",
  "hot singles",
  "bitcoin",
  "undelivered messages",
  "90% off",
  "bank details",
  "iphone",
  "bit.ly",
  "webmail-verify",
  "track-parcel",
  "free-iphone",
  "crypto-invest",
  "guaranteed 300%",
  "avoid suspension",
  "confirm payment of",
];

function isSpam(subject, body) {
  const blob = (subject + "\n" + body).toLowerCase();
  return SPAM_NEEDLES.some((n) => blob.includes(n));
}

export function classifyEmail(email) {
  const atts = email.attachments || [];
  const subject = norm(email.subject || "");
  const body = email.body || "";
  const subjU = subject.toUpperCase();

  if (atts.length) {
    return { category: "BL_COMPARISON", decided_by: "rule", confidence: 0.95 };
  }
  if (isSpam(subject, body)) {
    return { category: "SPAM", decided_by: "rule", confidence: 0.92 };
  }
  if (/\bREQUEST SI\b|\bCUST SI\b|\bSI NEEDED\b|\bLATEST SI\b/.test(subjU)) {
    return { category: "SI_REQUEST", decided_by: "rule", confidence: 0.95 };
  }
  if (/^(RE\s+)?SI\s+-/.test(subjU)) {
    return { category: "SI_REQUEST", decided_by: "rule", confidence: 0.93 };
  }
  if (/TO CONFIRM DOCS|REQUEST BL DRAFT|\bDRAFT BL\b/.test(subjU)) {
    return { category: "BL_COMPARISON", decided_by: "rule", confidence: 0.93 };
  }
  if (
    /CANCEL INVOICE|LOCAL CHARGES|D\s*&\s*D CHARGES|TOTAL FREIGHT|MISSING GR|RAK BILLING/.test(
      subjU
    )
  ) {
    return { category: "INVOICE_QUERY", decided_by: "rule", confidence: 0.93 };
  }
  if (
    /UPDATE SUMMARY|BERTHING REPORT|_?RPA_?|TIME OFF|NEW YEAR|OUTSTANDING BL|PENDING BL RELEASE|DELIVERY PLANNING|MISS CONNECTION|SUBMIT SI\s*&\s*AED|WELCOMING THE NEW YEAR/.test(
      subjU
    )
  ) {
    return { category: "GENERAL", decided_by: "rule", confidence: 0.9 };
  }
  if (/Please find Shipping instruction/.test(body)) {
    return { category: "SI_REQUEST", decided_by: "rule", confidence: 0.88 };
  }
  if (
    /send the draft BL|SI and draft BL|draft BL against the SI|check the details and confirm|verify the BL matches the SI/i.test(
      body
    )
  ) {
    return { category: "BL_COMPARISON", decided_by: "rule", confidence: 0.85 };
  }
  if (
    /Query on invoice|cancel invoice|GR is still missing|D&D \/ detention|detention charges/i.test(
      body
    )
  ) {
    return { category: "INVOICE_QUERY", decided_by: "rule", confidence: 0.85 };
  }
  if (/RPA Bot|No action required|berthing report|update summary/i.test(body)) {
    return { category: "GENERAL", decided_by: "rule", confidence: 0.8 };
  }
  return { category: "GENERAL", decided_by: "rule", confidence: 0.45 };
}
