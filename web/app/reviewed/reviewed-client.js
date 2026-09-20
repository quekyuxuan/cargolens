"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, displayStatus, statusClass } from "../../lib/labels";
import { loadLiveMail } from "../../lib/live-mail";
import { loadOverrides, mergeRecord, saveOverride } from "../../lib/overrides";
import Pager, { usePaged } from "../pager";

const PER_PAGE = 10;

export default function ReviewedClient({ rows }) {
  const [ovs, setOvs] = useState({});
  const [live, setLive] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOvs(loadOverrides());
    setLive(loadLiveMail());
  }, []);

  const list = useMemo(() => {
    const byId = {};
    for (const r of rows) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    for (const r of live) byId[r.email_id] = mergeRecord(r, ovs[r.email_id]);
    return Object.values(byId).filter((r) => r.reviewed === true);
  }, [rows, live, ovs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (r) =>
        (r.email_id || "").toLowerCase().includes(query) ||
        (r.subject || "").toLowerCase().includes(query) ||
        (r.from || "").toLowerCase().includes(query)
    );
  }, [list, q]);

  const { page, pages, setPage, slice } = usePaged(filtered, PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [q, setPage]);

  function restore(id) {
    saveOverride(id, { reviewed: false });
    setOvs(loadOverrides());
    setLive(loadLiveMail());
  }

  return (
    <main>
      <p className="kicker">Clerk archive</p>
      <h1>Reviewed</h1>
      <p className="lede wide">
        Comparison requests marked Done after a staff check. They stay off Inbox until restored.
      </p>

      {list.length === 0 ? (
        <p className="lede">Nothing here yet. Open a Comparison OK mail and press Done.</p>
      ) : (
        <>
          <div className="filters">
            <input
              className="search"
              placeholder="Search id, subject, sender"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <p className="count">
            {list.length} archived
            {filtered.length !== list.length ? " · " + filtered.length + " matching" : ""}
          </p>
          <table className="grid">
            <thead>
              <tr>
                <th>Email</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
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
                    <span className={"badge " + statusClass(r.status)}>
                      {displayStatus(r.status)}
                    </span>
                  </td>
                  <td>
                    <button className="btn ghost" type="button" onClick={() => restore(r.email_id)}>
                      Restore to inbox
                    </button>
                  </td>
                </tr>
              ))}
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={5}>No archived mail matches this search.</td>
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
      )}
    </main>
  );
}
