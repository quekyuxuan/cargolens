"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadLiveMail } from "../../lib/live-mail";
import { loadOverrides, mergeRecord } from "../../lib/overrides";

export default function RemindersClient({ seed }) {
  const [rows, setRows] = useState(() => (seed || []).filter((r) => r.status === "MISMATCH"));
  const [clerkOnly, setClerkOnly] = useState(false);

  useEffect(() => {
    const ovs = loadOverrides();
    const byId = {};
    for (const r of seed || []) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    for (const r of loadLiveMail()) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    setRows(
      Object.values(byId)
        .filter((r) => r.status === "MISMATCH")
        .map((r) => ({ ...r, by_clerk: r.engine_status && r.engine_status !== "MISMATCH" }))
    );
  }, [seed]);

  const visible = useMemo(
    () => (clerkOnly ? rows.filter((r) => r.by_clerk) : rows),
    [rows, clerkOnly]
  );

  const people = useMemo(() => {
    const map = {};
    for (const r of visible) {
      const email = (r.from || "").trim() || "(no address)";
      if (!map[email]) map[email] = { email, count: 0, cases: [] };
      map[email].count += 1;
      map[email].cases.push(r);
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [visible]);

  const clerkCount = rows.filter((r) => r.by_clerk).length;

  return (
    <main>
      <p className="kicker">Follow up</p>
      <h1>Mismatch senders</h1>
      <p className="lede">
        One row per email address that produced a mismatch. Use it to remind the same person instead
        of hunting through Inbox.
      </p>
      <p className="count">
        {people.length} senders · {visible.length} mismatch cases
        {clerkCount ? (
          <>
            {" · "}
            <label>
              <input
                type="checkbox"
                checked={clerkOnly}
                onChange={(e) => setClerkOnly(e.target.checked)}
              />{" "}
              only the {clerkCount} a clerk flagged
            </label>
          </>
        ) : null}
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Sender</th>
            <th>Times</th>
            <th>Latest case</th>
            <th>Fields</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => {
            const latest = p.cases[p.cases.length - 1];
            return (
              <tr key={p.email}>
                <td>{p.email}</td>
                <td>{p.count}</td>
                <td>
                  <Link href={"/mail/" + latest.email_id}>{latest.email_id}</Link>
                  {latest.by_clerk ? <span className="badge hold"> clerk</span> : null}
                  <div className="sub">{latest.subject}</div>
                </td>
                <td>{(latest.defect_fields || []).join(", ") || "—"}</td>
                <td>
                  {p.email.includes("@") ? (
                    <a className="btn" href={mailtoRemind(p)}>
                      Remind
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}

function mailtoRemind(person) {
  const ids = person.cases.map((c) => c.email_id).join(", ");
  const subject = encodeURIComponent("Please check SI vs bill of lading — " + person.count + " mismatch(es)");
  const body = encodeURIComponent(
    "Hi,\n\nWe flagged a mismatch on: " +
      ids +
      ".\n\nPlease confirm shipper / consignee / notify / ports / containers / weight against the shipping instruction.\n\nThanks,\nDocumentation"
  );
  return "mailto:" + person.email + "?subject=" + subject + "&body=" + body;
}
