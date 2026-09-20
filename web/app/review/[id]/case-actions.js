"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KIND_LABELS, loadOverrides, mailtoResend, mergeRecord, saveOverride } from "../../../lib/overrides";
import { CAT_LABELS, FIELD_LABELS, displayStatus, statusClass } from "../../../lib/labels";
import { loadLiveMail } from "../../../lib/live-mail";
import { compareFields, FIELDS } from "../../../lib/compare";
import AttachmentPanel from "../../../lib/attachment-panel";

function readFileB64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CaseActions({ rec: initial, id }) {
  const [rec, setRec] = useState(initial);
  const [state, setState] = useState(null);
  const [note, setNote] = useState("");
  const [retries, setRetries] = useState(0);
  const [siFile, setSiFile] = useState(null);
  const [blFile, setBlFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    let base = initial;
    if (!base && id) base = loadLiveMail().find((r) => r.email_id === id) || null;
    const ov = base ? loadOverrides()[base.email_id] : null;
    setState(ov || null);
    setNote(ov?.note || "");
    setRetries(ov?.retries || 0);
    setRec(base ? mergeRecord(base, ov) : null);
  }, [initial, id]);

  if (!rec) {
    return (
      <main>
        <p className="kicker">
          <Link href="/review">Review queue</Link>
        </p>
        <h1>Case not on this device</h1>
      </main>
    );
  }

  function act(action, extra) {
    const saved = saveOverride(rec.email_id, { action, closed: true, note, retries, ...extra });
    setState(saved);
    setRec(mergeRecord(rec, saved));
  }

  function confirmDraft() {
    const draft = rec.draft_compare;
    if (!draft) {
      setHint("Run a check on a replacement bill of lading first.");
      return;
    }
    const saved = saveOverride(rec.email_id, {
      ...draft,
      action: "clerk_confirmed_compare",
      closed: true,
      note,
      review_reason: null,
    });
    setState(saved);
    setRec(mergeRecord(rec, saved));
    setHint("Filed as " + draft.status + ". Inbox now shows this comparison.");
  }

  async function runFiles(kind) {
    if (!siFile || !blFile) {
      setHint("Attach both the shipping instruction and the bill of lading (correct type).");
      return;
    }
    setBusy(kind === "vision" ? "Calling Gemini vision…" : "Reading files…");
    setHint("");
    try {
      let siFields = rec.si_fields || {};
      let blFields = {};
      const siTxt = siFile.name.toLowerCase().endsWith(".txt") ? await siFile.text() : null;
      const blTxt = blFile.name.toLowerCase().endsWith(".txt") ? await blFile.text() : null;
      if (siTxt && blTxt) {
        setHint("Plain text uploaded. Use Gemini for scans/PDFs, or type fields on the mail page.");
      }
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          si: await readFileB64(siFile),
          bl: await readFileB64(blFile),
          siName: siFile.name,
          blName: blFile.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint(
          (data.hint || data.error || "Could not analyse") +
            " Status stays Pending until a readable SI + bill of lading is attached."
        );
        setBusy("");
        act("pending_unreadable", {
          closed: false,
          status: "NEEDS_REVIEW",
          review_reason: rec.review_reason || "wrong_doc_type",
        });
        return;
      }
      siFields = data.si_fields || siFields;
      blFields = data.bl_fields || {};
      const cmp = compareFields(siFields, blFields);
      const n = retries + 1;
      setRetries(n);
      const saved = saveOverride(rec.email_id, {
        action: "draft_compare",
        closed: false,
        note,
        retries: n,
        extracted_by: "gemini-vision",
        si_fields: siFields,
        bl_fields: blFields,
        draft_compare: cmp,
        status: "NEEDS_REVIEW",
        review_reason: rec.review_reason || "wrong_doc_type",
        rows: cmp.rows,
      });
      setState(saved);
      setRec(mergeRecord(rec, saved));
      setBusy("");
      setHint("Draft comparison ready. Confirm below to file as OK or MISMATCH. Nothing is auto-OK.");
    } catch (e) {
      setBusy("");
      setHint(String(e));
    }
  }

  const reason = rec.review_reason;
  const kinds = rec.file_kinds || rec.attachment_views || [];

  return (
    <main>
      <p className="kicker">
        <Link href="/review">Review queue</Link> / {rec.email_id}
      </p>
      <h1>{rec.subject}</h1>
      <p className="mail-meta">
        From <a href={"mailto:" + (rec.from || "")}>{rec.from || "unknown sender"}</a>
        {" · "}
        {CAT_LABELS[rec.category]} ·{" "}
        <span className={"badge " + statusClass(rec.status)}>{displayStatus(rec.status)}</span>
        {reason ? (
          <>
            {" · "}
            <span className="badge hold">{reason}</span>
          </>
        ) : null}
      </p>

      {reason === "wrong_doc_type" ? (
        <div className="note">
          <strong>Wrong document type — Pending.</strong> We still extract what we can (invoice,
          packing list, etc.) so a clerk can see it. That is not a comparison. Status stays Pending
          until someone attaches a real bill of lading, we analyse it, and a clerk confirms.
          <ul>
            {kinds.map((f) => (
              <li key={f.path}>
                <code>{(f.path || f.name || "").split("/").pop()}</code>
                {" — "}
                {KIND_LABELS[f.kind] || f.kind}
              </li>
            ))}
          </ul>
          {(rec.si_fields || rec.bl_fields) && (
            <table className="compare" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>What we could read (not compared)</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((field) => (
                  <tr key={field}>
                    <td className="fld">{FIELD_LABELS[field]}</td>
                    <td>
                      SI: {rec.si_fields?.[field] || "—"}
                      <br />
                      Other file: {rec.bl_fields?.[field] || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {reason === "missing_attachment" ? (
        <div className="note">
          <strong>Pending — missing attachment.</strong> Ask the sender to send SI and bill of lading.
          <div style={{ marginTop: 10 }}>
            Contact: <a href={mailtoResend(rec)}>{rec.from || "no address on file"}</a>
          </div>
        </div>
      ) : null}

      {reason === "unreadable" ? (
        <div className="note">
          <strong>Pending — unreadable.</strong> Upload readable files and run Gemini. Confirm before
          the case becomes OK or MISMATCH.
        </div>
      ) : null}

      {reason === "missing_value" ? (
        <div className="note">
          <strong>Pending — blank required value.</strong> Complete on the mail page, then confirm.
        </div>
      ) : null}

      <h2>Original message</h2>
      {rec.body ? <p className="body-text">{rec.body}</p> : <p className="lede">No body text.</p>}
      <AttachmentPanel rec={rec} />

      <p>
        <Link href={"/mail/" + rec.email_id}>Open full mail view →</Link>
      </p>

      <h2>Actions</h2>
      {state?.action ? (
        <p>
          Last action: <span className="badge ok">{state.action}</span>
          {state.note ? " — " + state.note : ""}
        </p>
      ) : null}
      {hint ? <div className="note">{hint}</div> : null}
      {busy ? <p>{busy}</p> : null}

      <p>
        <label>
          Clerk note
          <br />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={{ width: "100%", maxWidth: 560, font: "inherit" }}
          />
        </label>
      </p>

      {reason === "wrong_doc_type" || reason === "unreadable" || reason === "missing_attachment" || !reason ? (
        <div className="note">
          <p>Replace with the correct pair, then analyse. Confirm is required to leave Pending.</p>
          <p>
            Shipping instruction{" "}
            <input type="file" accept=".pdf,.txt,image/*" onChange={(e) => setSiFile(e.target.files?.[0] || null)} />
          </p>
          <p>
            Bill of lading{" "}
            <input type="file" accept=".pdf,.txt,image/*" onChange={(e) => setBlFile(e.target.files?.[0] || null)} />
          </p>
          <button className="btn" type="button" onClick={() => runFiles("vision")} disabled={!!busy}>
            Analyse replacement ({retries})
          </button>
          <button className="btn" type="button" onClick={confirmDraft} disabled={!rec.draft_compare}>
            Confirm and file report
          </button>
          <a className="btn ghost" href={mailtoResend(rec)}>
            Ask sender for the correct type
          </a>
        </div>
      ) : null}

      {reason === "missing_value" ? (
        <>
          <button className="btn" type="button" onClick={() => act("asked_customer_to_complete")}>
            Ask customer to complete SI
          </button>
          <Link className="btn ghost" href={"/mail/" + rec.email_id}>
            Clerk types values on the mail page
          </Link>
        </>
      ) : null}

      <div className="actions">
        <button className="btn ghost" type="button" onClick={() => act("confirmed_engine")}>
          Keep pending / agree with engine
        </button>
      </div>
    </main>
  );
}
