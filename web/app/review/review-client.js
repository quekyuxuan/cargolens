"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadOverrides } from "../../lib/overrides";

const REASON_COPY = {
  wrong_doc_type: "Wrong file — not an SI/BL pair",
  missing_attachment: "Attachment missing — ask sender to resend",
  unreadable: "File cannot be read — retry or request a clean scan",
  missing_value: "Required field blank — fill or ask the customer",
};

export default function ReviewClient({ queue }) {
  const [done, setDone] = useState({});

  useEffect(() => {
    setDone(loadOverrides());
  }, []);

  const open = queue.filter((r) => !done[r.email_id]?.closed);
  const closed = queue.filter((r) => done[r.email_id]?.closed);

  return (
    <>
      <p style={{ fontSize: 14 }}>
        {open.length} waiting · {closed.length} handled in this browser
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Email</th>
            <th>Why it stopped</th>
            <th>From</th>
            <th>Subject</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {queue.map((r) => {
            const state = done[r.email_id];
            return (
              <tr key={r.email_id}>
                <td>
                  <Link href={"/review/" + r.email_id}>{r.email_id}</Link>
                </td>
                <td>
                  <span className="badge hold">{r.review_reason}</span>
                  <div style={{ color: "#5c6b74", fontSize: 12, marginTop: 4 }}>
                    {REASON_COPY[r.review_reason] || "Needs a person"}
                  </div>
                </td>
                <td>{r.from || "—"}</td>
                <td>{r.subject}</td>
                <td>
                  {state?.closed ? (
                    <span className="badge ok">{state.action}</span>
                  ) : (
                    <Link href={"/review/" + r.email_id}>Open case →</Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
