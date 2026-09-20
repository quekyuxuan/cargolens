"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, displayStatus, statusClass } from "../../lib/labels";
import { loadLiveMail } from "../../lib/live-mail";
import {
  exportClerkState,
  importClerkState,
  loadOverrides,
  mergeRecord,
  saveOverride,
} from "../../lib/overrides";

export default function ReviewedClient({ rows }) {
  const [ovs, setOvs] = useState({});
  const [live, setLive] = useState([]);
  const [msg, setMsg] = useState("");

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

  function restore(id) {
    saveOverride(id, { reviewed: false });
    setOvs(loadOverrides());
    setLive(loadLiveMail());
  }

  function download() {
    const blob = new Blob([exportClerkState()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cargolens-handover-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(file) {
    if (!file) return;
    try {
      const count = importClerkState(await file.text());
      setOvs(loadOverrides());
      setLive(loadLiveMail());
      setMsg("Imported. " + count + " cases now carry a clerk decision.");
    } catch (e) {
      setMsg(String(e.message || e));
    }
  }

  return (
    <main>
      <p className="kicker">Clerk archive</p>
      <h1>Reviewed</h1>
      <p className="lede">
        Comparison requests marked Done after a staff check. They stay off Inbox until restored.
      </p>
      <p className="count">{list.length} archived</p>

      <div className="note">
        <strong>Decisions live on this device.</strong> Every clerk action — Done, edited fields,
        vision results — is stored in this browser, because the deployed site has a read-only disk.
        Hand over to a colleague or another machine with the file below. In production this same
        payload goes to one shared table instead of a download.
        <div style={{ marginTop: 10 }}>
          <button className="btn" type="button" onClick={download}>
            Export decisions
          </button>
          <label className="btn ghost" style={{ cursor: "pointer" }}>
            Import decisions
            <input
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </div>
        {msg ? <p style={{ margin: "10px 0 0" }}>{msg}</p> : null}
      </div>
      {list.length === 0 ? (
        <p className="lede">Nothing here yet. Open a Comparison OK mail and press Done.</p>
      ) : (
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
            {list.map((r) => (
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
                <td>
                  <button className="btn ghost" type="button" onClick={() => restore(r.email_id)}>
                    Restore to inbox
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
