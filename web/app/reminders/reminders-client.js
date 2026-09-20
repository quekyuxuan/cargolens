"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadLiveMail } from "../../lib/live-mail";
import { loadOverrides, mergeRecord } from "../../lib/overrides";
import Pager, { usePaged } from "../pager";

const PER_PAGE = 10;

export default function RemindersClient({ seed }) {
  const [rows, setRows] = useState(() => (seed || []).filter((r) => r.status === "MISMATCH"));
  const [clerkOnly, setClerkOnly] = useState(false);
  const [q, setQ] = useState("");

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

  // Keep a sender's full case list intact; a subject hit still shows the whole row.
  const matched = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return people;
    return people.filter(
      (p) =>
        p.email.toLowerCase().includes(query) ||
        p.cases.some(
          (c) =>
            (c.email_id || "").toLowerCase().includes(query) ||
            (c.subject || "").toLowerCase().includes(query)
        )
    );
  }, [people, q]);

  const { page, pages, setPage, slice } = usePaged(matched, PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [q, clerkOnly, setPage]);

  const clerkCount = rows.filter((r) => r.by_clerk).length;

  return (
    <main>
      <p className="kicker">Follow up</p>
      <h1>Mismatch senders</h1>
      <p className="lede wide">
        One row per email address that produced a mismatch. Use it to remind the same person instead
        of hunting through Inbox.
      </p>
      <div className="filters">
        <input
          className="search"
          placeholder="Search sender, subject, email id"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <p className="count">
        {matched.length} senders · {visible.length} mismatch cases
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
          {slice.map((p) => {
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
          {slice.length === 0 ? (
            <tr>
              <td colSpan={5}>No sender matches this search.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <Pager
        page={page}
        pages={pages}
        onPage={setPage}
        total={matched.length}
        perPage={PER_PAGE}
        noun="senders"
      />
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
