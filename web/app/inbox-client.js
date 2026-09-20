"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, statusClass } from "../lib/labels";

const CATS = ["ALL", "BL_COMPARISON", "SI_REQUEST", "INVOICE_QUERY", "GENERAL", "SPAM"];
const STATUSES = ["ALL", "OK", "MISMATCH", "NEEDS_REVIEW"];

export default function InboxClient({ rows }) {
  const [cat, setCat] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "ALL" && r.category !== cat) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!query) return true;
      return (
        (r.email_id || "").includes(query) ||
        (r.subject || "").toLowerCase().includes(query) ||
        (r.from || "").toLowerCase().includes(query)
      );
    });
  }, [rows, cat, status, q]);

  return (
    <>
      <div className="filters">
        <input
          className="search"
          placeholder="Search id, subject, sender"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sel">
          Type
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All types" : CAT_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="sel">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ fontSize: 13, color: "#5c6b74", margin: "0 0 10px" }}>
        Showing {filtered.length} of {rows.length}
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
          {filtered.map((r) => (
            <tr key={r.email_id}>
              <td>
                <Link href={"/mail/" + r.email_id}>{r.email_id}</Link>
              </td>
              <td>{r.subject}</td>
              <td>
                <span className="badge cat">{CAT_LABELS[r.category] || r.category}</span>
              </td>
              <td>
                <span className={"badge " + statusClass(r.status)}>{r.status}</span>
              </td>
              <td>{(r.defect_fields || []).join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
