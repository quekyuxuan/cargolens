"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, FIELD_LABELS, statusClass } from "../lib/labels";
import { KIND_LABELS, loadOverrides } from "../lib/overrides";

export default function MailView({ rec }) {
  const [ov, setOv] = useState(null);
  useEffect(() => {
    setOv(loadOverrides()[rec.email_id] || null);
  }, [rec.email_id]);

  const status = ov?.closed ? rec.status : rec.status;
  const rows = rec.rows || [];
  const defects = rec.defect_fields || [];

  return (
    <main>
      <p className="kicker">
        <Link href="/">Inbox</Link> / {rec.email_id}
      </p>
      <div className="mail-head">
        <h1>{rec.subject || rec.email_id}</h1>
        <p className="mail-meta">
          From {rec.from || "—"} · {CAT_LABELS[rec.category] || rec.category} · decided by{" "}
          {rec.decided_by || "pipeline"}
        </p>
        <span className={"badge " + statusClass(status)}>{status}</span>
        {rec.review_reason ? <span className="badge hold"> {rec.review_reason}</span> : null}
        {ov?.action ? <span className="badge ok"> clerk: {ov.action}</span> : null}
      </div>

      {ov?.note ? <div className="note">Clerk note: {ov.note}</div> : null}

      {rec.file_kinds?.length ? (
        <p className="mail-meta">
          Files:{" "}
          {rec.file_kinds.map((f) => (f.path || "").split("/").pop() + " (" + (KIND_LABELS[f.kind] || f.kind) + ")").join(" · ")}
        </p>
      ) : null}

      {rec.status === "NEEDS_REVIEW" ? (
        <div className="note">
          Engine would not auto-close this case ({rec.review_reason}).
          {"  "}
          <Link href={"/review/" + rec.email_id}>Open the reason-specific actions</Link>
        </div>
      ) : null}

      {rec.status === "OK" && rec.category === "BL_COMPARISON" && rows.length > 0 ? (
        <div className="note">No mismatch detected across the seven shipment fields.</div>
      ) : null}

      {rec.status === "MISMATCH" ? (
        <div className="note">
          Flagged {defects.length} field{defects.length === 1 ? "" : "s"}: {defects.join(", ")}.
        </div>
      ) : null}

      {rows.length ? (
        <table className="compare">
          <thead>
            <tr>
              <th>Field</th>
              <th>Shipping instruction</th>
              <th>Draft bill of lading</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className={row.match === false ? "hit" : ""}>
                <td className="fld">
                  {FIELD_LABELS[row.field] || row.field}
                  <div style={{ fontWeight: 400, color: "#5c6b74", fontSize: 12, marginTop: 4 }}>
                    {row.match === false ? "Mismatch" : row.match === true ? "Match" : "Not compared"}
                  </div>
                </td>
                <td className="si">{row.si || "—"}</td>
                <td className="bl">{row.bl || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="lede">
          {rec.category === "BL_COMPARISON"
            ? "No SI/BL pair was compared (waiting for files, or sent to review)."
            : "Classification only — not a document-comparison request."}
        </p>
      )}
    </main>
  );
}
