"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, displayStatus, statusClass, summarize } from "../lib/labels";
import { loadLiveMail } from "../lib/live-mail";
import { clearClerkLocal, loadOverrides, mergeRecord } from "../lib/overrides";
import Pager, { usePaged } from "./pager";

const CATS = ["ALL", "BL_COMPARISON", "SI_REQUEST", "INVOICE_QUERY", "GENERAL", "SPAM"];
const STATUSES = ["ALL", "OK", "MISMATCH", "NEEDS_REVIEW"];
const PER_PAGE = 20;

export default function InboxClient({ rows }) {
  const [cat, setCat] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [live, setLive] = useState([]);
  const [ovs, setOvs] = useState({});

  useEffect(() => {
    setLive(loadLiveMail());
    setOvs(loadOverrides());
  }, []);

  const merged = useMemo(() => {
    const byId = {};
    for (const r of rows) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    for (const r of live) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    return Object.values(byId);
  }, [rows, live, ovs]);

  const inbox = useMemo(() => merged.filter((r) => r.reviewed !== true), [merged]);
  const s = useMemo(() => summarize(inbox), [inbox]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return inbox.filter((r) => {
      if (cat === "OTHER") {
        if (r.category === "BL_COMPARISON") return false;
      } else if (cat !== "ALL" && r.category !== cat) {
        return false;
      }
      if (status !== "ALL" && r.status !== status) return false;
      if (!query) return true;
      return (
        (r.email_id || "").includes(query) ||
        (r.subject || "").toLowerCase().includes(query) ||
        (r.from || "").toLowerCase().includes(query)
      );
    });
  }, [inbox, cat, status, q]);

  const { page, pages, setPage, slice } = usePaged(filtered, PER_PAGE);

  // A new filter should start at the top of its own result set, not mid-way.
  useEffect(() => {
    setPage(1);
  }, [cat, status, q, setPage]);

  function clickStat(nextCat, nextStatus) {
    setCat(nextCat);
    setStatus(nextStatus);
    setQ("");
  }

  function resetClerk() {
    if (!window.confirm("Clear all clerk edits, Done marks, and uploaded live mail? Official 520 results stay.")) {
      return;
    }
    clearClerkLocal();
    setOvs({});
    setLive([]);
    setCat("ALL");
    setStatus("ALL");
    setQ("");
  }

  return (
    <>
      <div className="stats">
        <button
          className={"stat" + (cat === "BL_COMPARISON" && status === "OK" ? " on" : "")}
          type="button"
          onClick={() => clickStat("BL_COMPARISON", "OK")}
        >
          <b>{s.compare_ok}</b>
          <span>Comparison OK</span>
        </button>
        <button
          className={"stat" + (cat === "ALL" && status === "MISMATCH" ? " on" : "")}
          type="button"
          onClick={() => clickStat("ALL", "MISMATCH")}
        >
          <b>{s.mismatch}</b>
          <span>Mismatches</span>
        </button>
        <button
          className={"stat" + (cat === "ALL" && status === "NEEDS_REVIEW" ? " on" : "")}
          type="button"
          onClick={() => clickStat("ALL", "NEEDS_REVIEW")}
        >
          <b>{s.pending}</b>
          <span>Pending review</span>
        </button>
        <button
          className={"stat" + (cat === "OTHER" ? " on" : "")}
          type="button"
          onClick={() => clickStat("OTHER", "ALL")}
        >
          <b>{s.other}</b>
          <span>Other mail</span>
        </button>
      </div>
      <div className="filters">
        <input
          className="search"
          placeholder="Search id, subject, sender"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sel">
          Type
          <select
            value={cat === "OTHER" ? "OTHER" : cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All types" : CAT_LABELS[c]}
              </option>
            ))}
            <option value="OTHER">Other mail</option>
          </select>
        </label>
        <label className="sel">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st === "ALL" ? "All statuses" : displayStatus(st)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn ghost push-right" type="button" onClick={resetClerk}>
          Restore original
        </button>
      </div>
      <p className="count">
        Showing {filtered.length}
        {cat === "BL_COMPARISON" && status === "OK" ? " comparison OK" : ""}
        {" · "}
        {inbox.length} still in inbox
        {s.reviewed ? " · " + s.reviewed + " on Reviewed" : ""}
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Email</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Status</th>
            <th>Fields</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r) => (
            <tr key={r.email_id}>
              <td>
                <Link href={"/mail/" + r.email_id}>{r.email_id}</Link>
              </td>
              <td>{r.subject}</td>
              <td>
                <span className="badge cat">{CAT_LABELS[r.category] || r.category}</span>
              </td>
              <td>
                <span className={"badge " + statusClass(r.status)}>{displayStatus(r.status)}</span>
              </td>
              <td>{(r.defect_fields || []).join(", ") || "—"}</td>
            </tr>
          ))}
          {slice.length === 0 ? (
            <tr>
              <td colSpan={5}>No mail matches this filter.</td>
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
        noun="emails"
      />
    </>
  );
}
