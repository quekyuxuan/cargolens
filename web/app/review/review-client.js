"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadLiveMail } from "../../lib/live-mail";
import { loadOverrides, mergeRecord } from "../../lib/overrides";
import { displayStatus } from "../../lib/labels";

const REASON_COPY = {
  wrong_doc_type: "Pending — wrong type. Extract shown; replace BL then clerk confirms",
  missing_attachment: "Pending — attachment missing, ask sender to resend",
  unreadable: "Pending — cannot read; retry Gemini or request a clean scan",
  missing_value: "Pending — required field blank",
};

export default function ReviewClient({ queue }) {
  const [done, setDone] = useState({});
  const [live, setLive] = useState([]);

  useEffect(() => {
    setDone(loadOverrides());
    setLive(loadLiveMail());
  }, []);

  const all = useMemo(() => {
    const byId = {};
    for (const r of queue) byId[r.email_id] = mergeRecord(r, done[r.email_id]);
    for (const r of live) {
      const m = mergeRecord(r, done[r.email_id]);
      if (m.status === "NEEDS_REVIEW" || done[r.email_id]) byId[r.email_id] = m;
    }
    return Object.values(byId);
  }, [queue, live, done]);

  const open = all.filter((r) => r.status === "NEEDS_REVIEW" && !done[r.email_id]?.closed);
  const closed = all.filter((r) => done[r.email_id]?.closed);

  return (
    <>
      <p className="count">
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
          {all.map((r) => {
            const state = done[r.email_id];
            return (
              <tr key={r.email_id}>
                <td>
                  <Link href={"/review/" + r.email_id}>{r.email_id}</Link>
                </td>
                <td>
                  <span className="badge hold">{r.review_reason || displayStatus(r.status)}</span>
                  <div className="sub">
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
