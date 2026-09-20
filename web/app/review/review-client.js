"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadLiveMail } from "../../lib/live-mail";
import { loadOverrides, mergeRecord } from "../../lib/overrides";
import { displayStatus } from "../../lib/labels";
import Pager, { usePaged } from "../pager";

const REASON_COPY = {
  wrong_doc_type: "Pending — wrong type. Extract shown; replace BL then clerk confirms",
  missing_attachment: "Pending — attachment missing, ask sender to resend",
  unreadable: "Pending — cannot read; retry Gemini or request a clean scan",
  missing_value: "Pending — required field blank",
};

const REASON_LABELS = {
  wrong_doc_type: "Wrong document type",
  missing_attachment: "Missing attachment",
  unreadable: "Unreadable file",
  missing_value: "Blank required value",
};

const PER_PAGE = 10;

export default function ReviewClient({ queue }) {
  const [done, setDone] = useState({});
  const [live, setLive] = useState([]);
  const [reason, setReason] = useState("ALL");
  const [q, setQ] = useState("");

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

  // Driven by the data, so a reason we have not seen before still gets an option.
  const reasons = useMemo(() => {
    const seen = new Set();
    for (const r of all) if (r.review_reason) seen.add(r.review_reason);
    return [...seen].sort();
  }, [all]);

  const counts = useMemo(() => {
    const map = {};
    for (const r of all) {
      const key = r.review_reason || "—";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((r) => {
      if (reason !== "ALL" && r.review_reason !== reason) return false;
      if (!query) return true;
      return (
        (r.email_id || "").toLowerCase().includes(query) ||
        (r.subject || "").toLowerCase().includes(query) ||
        (r.from || "").toLowerCase().includes(query) ||
        (r.review_reason || "").toLowerCase().includes(query)
      );
    });
  }, [all, reason, q]);

  const { page, pages, setPage, slice } = usePaged(filtered, PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [reason, q, setPage]);

  return (
    <>
      <div className="filters">
        <input
          className="search"
          placeholder="Search id, sender, subject, reason"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sel">
          Why it stopped
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="ALL">All reasons ({all.length})</option>
            {reasons.map((key) => (
              <option key={key} value={key}>
                {(REASON_LABELS[key] || key) + " (" + (counts[key] || 0) + ")"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="count">
        {open.length} waiting · {closed.length} handled in this browser
        {filtered.length !== all.length ? " · " + filtered.length + " matching" : ""}
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
          {slice.map((r) => {
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
          {slice.length === 0 ? (
            <tr>
              <td colSpan={5}>No case matches this filter.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <Pager
        page={page}
        pages={pages}
        onPage={setPage}
        total={filtered.length}
        perPage={PER_PAGE}
        noun="cases"
      />
    </>
  );
}
