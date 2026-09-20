"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CAT_LABELS, FIELD_LABELS, displayStatus, statusClass } from "../lib/labels";
import { loadLiveMail } from "../lib/live-mail";
import { KIND_LABELS, loadOverrides, mergeRecord, saveOverride } from "../lib/overrides";
import { compareFields, FIELDS } from "../lib/compare";
import AttachmentPanel from "../lib/attachment-panel";

export default function MailView({ rec: initial, id }) {
  const [rec, setRec] = useState(initial);
  const [ov, setOv] = useState(null);
  const [edit, setEdit] = useState(false);
  const [si, setSi] = useState({});
  const [bl, setBl] = useState({});

  useEffect(() => {
    let base = initial;
    if (!base && id) {
      base = loadLiveMail().find((r) => r.email_id === id) || null;
    }
    const override = base ? loadOverrides()[base.email_id] : id ? loadOverrides()[id] : null;
    setOv(override || null);
    const merged = base ? mergeRecord(base, override) : null;
    setRec(merged);
    setSi(merged?.si_fields || {});
    setBl(merged?.bl_fields || {});
  }, [initial, id]);

  if (!rec) {
    return (
      <main>
        <p className="kicker">
          <Link href="/">Inbox</Link>
        </p>
        <h1>Email not on this device</h1>
        <p className="lede">Outlook / upload cases live in this browser only.</p>
      </main>
    );
  }

  const rows = rec.rows || [];
  const defects = rec.defect_fields || [];

  function markDone() {
    const saved = saveOverride(rec.email_id, { reviewed: true, action: ov?.action || "clerk_done" });
    setOv(saved);
    setRec(mergeRecord(rec, saved));
  }

  function undoDone() {
    const saved = saveOverride(rec.email_id, { reviewed: false });
    setOv(saved);
    setRec(mergeRecord(rec, saved));
  }

  function writeReport() {
    const cmp = compareFields(si, bl);
    const saved = saveOverride(rec.email_id, {
      si_fields: si,
      bl_fields: bl,
      ...cmp,
      action: "clerk_wrote_report",
      closed: true,
    });
    setOv(saved);
    setRec(mergeRecord(rec, saved));
    setEdit(false);
  }

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
          {rec.extracted_by ? " · " + rec.extracted_by : ""}
        </p>
        <span className={"badge " + statusClass(rec.status)}>{displayStatus(rec.status)}</span>
        {rec.review_reason ? <span className="badge hold"> {rec.review_reason}</span> : null}
        {ov?.action ? <span className="badge ok"> clerk: {ov.action}</span> : null}
      </div>

      {ov?.note ? <div className="note">Clerk note: {ov.note}</div> : null}

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Original message</h2>
      <p className="lede" style={{ whiteSpace: "pre-wrap", maxWidth: "none" }}>
        {rec.body || "(empty body)"}
      </p>

      <AttachmentPanel rec={rec} />

      {rec.status === "NEEDS_REVIEW" ? (
        <div className="note">
          Pending ({rec.review_reason}). The engine will not mark Comparison OK until a clerk confirms
          a valid SI + bill of lading pair.
          {"  "}
          <Link href={"/review/" + rec.email_id}>Open case actions</Link>
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

      {rec.category === "BL_COMPARISON" ? (
        <p>
          <button className="btn ghost" type="button" onClick={() => setEdit(!edit)}>
            {edit ? "Cancel edit" : "Clerk: edit fields and write back to report"}
          </button>
        </p>
      ) : null}

      {edit ? (
        <div className="note">
          <p>Edits stay in this browser and replace the comparison sheet on Inbox / Review.</p>
          <table className="compare">
            <thead>
              <tr>
                <th>Field</th>
                <th>SI</th>
                <th>Bill of lading</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((field) => (
                <tr key={field}>
                  <td className="fld">{FIELD_LABELS[field] || field}</td>
                  <td>
                    <input
                      className="search"
                      value={si[field] || ""}
                      onChange={(e) => setSi({ ...si, [field]: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="search"
                      value={bl[field] || ""}
                      onChange={(e) => setBl({ ...bl, [field]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" type="button" onClick={writeReport}>
            Save to report
          </button>
        </div>
      ) : rows.length ? (
        <table className="compare">
          <thead>
            <tr>
              <th>Field</th>
              <th>Shipping instruction</th>
              <th>Bill of lading</th>
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
      ) : rec.category === "BL_COMPARISON" ? (
        <p className="lede">No SI / bill of lading pair was compared yet (pending files or review).</p>
      ) : (
        <p className="lede">Not a comparison request — classified only. Body and files are above.</p>
      )}

      {rec.category === "BL_COMPARISON" && rec.status === "OK" ? (
        <div className="note" style={{ marginTop: 24 }}>
          {rec.reviewed ? (
            <>
              This mail is on <Link href="/reviewed">Reviewed</Link> and hidden from Inbox.
              {"  "}
              <button className="btn ghost" type="button" onClick={undoDone}>
                Restore to inbox
              </button>
            </>
          ) : (
            <>
              Staff check finished? Mark Done to hide it from Inbox.
              <div style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={markDone}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </main>
  );
}
