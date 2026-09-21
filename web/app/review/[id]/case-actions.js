"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KIND_LABELS, loadOverrides, mailtoResend, mergeRecord, saveOverride } from "../../../lib/overrides";
import { CAT_LABELS, FIELD_LABELS, displayStatus, statusClass } from "../../../lib/labels";
import { loadLiveMail } from "../../../lib/live-mail";
import { applyCompare, FIELDS } from "../../../lib/compare";
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

async function bufferToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(await buf.arrayBuffer());
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(s);
}

function pickAttachedPair(rec) {
  const paths = (rec.attachments || []).map((p) => String(p).replace(/\\/g, "/"));
  const si = paths.find((p) => /_SI\.|shipping.?instruction/i.test(p));
  const bl = paths.find((p) => p !== si && /_BL\.|bill.?of.?lading/i.test(p));
  if (si && bl) return [si, bl];
  if (paths.length >= 2) return [paths[0], paths[1]];
  return [null, null];
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
      setHint("Run Gemini on the scans (or a replacement pair) first.");
      return;
    }
    const saved = saveOverride(rec.email_id, {
      ...draft,
      action: "clerk_confirmed_compare",
      closed: true,
      note,
      review_reason: null,
      clerk_confirmed: true,
      extracted_by: rec.extracted_by || "gemini-vision",
    });
    setState(saved);
    setRec(mergeRecord(rec, saved));
    setHint("Filed as " + draft.status + ". Inbox now shows this comparison.");
  }

  async function saveGeminiDraft(siFields, blFields, model) {
    const cmp = applyCompare(siFields, blFields);
    const n = retries + 1;
    setRetries(n);
    const saved = saveOverride(rec.email_id, {
      action: "draft_compare",
      closed: false,
      note,
      retries: n,
      extracted_by: "gemini-vision",
      gemini_model: model || null,
      si_fields: siFields,
      bl_fields: blFields,
      draft_compare: cmp,
      status: "NEEDS_REVIEW",
      review_reason: "gemini_draft",
      has_defect: false,
      defect_fields: [],
      rows: cmp.rows,
      clerk_confirmed: false,
    });
    setState(saved);
    setRec(mergeRecord(rec, saved));
    setHint(
      "Gemini scan ready — still a comparison request. Check the table, then Confirm. Nothing is auto-OK."
    );
  }

  async function analyseAttachedScans() {
    const [siPath, blPath] = pickAttachedPair(rec);
    if (!siPath || !blPath) {
      setHint("This case has no SI/BL paths on file. Upload both files below.");
      return;
    }
    setBusy("Fetching originals and calling Gemini…");
    setHint("");
    try {
      const [siRes, blRes] = await Promise.all([
        fetch("/api/files?path=" + encodeURIComponent(siPath)),
        fetch("/api/files?path=" + encodeURIComponent(blPath)),
      ]);
      if (!siRes.ok || !blRes.ok) {
        const fail = !siRes.ok ? await siRes.json().catch(() => ({})) : await blRes.json().catch(() => ({}));
        setBusy("");
        setHint(
          (fail.hint || "Originals are not on this host.") +
            " Upload the two scan PDFs below, or use Demo with email_512.json + the pair."
        );
        return;
      }
      const siName = siPath.split("/").pop();
      const blName = blPath.split("/").pop();
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          si: await bufferToB64(await siRes.blob()),
          bl: await bufferToB64(await blRes.blob()),
          siName,
          blName,
        }),
      });
      const data = await res.json();
      setBusy("");
      if (!res.ok) {
        setHint(data.hint || data.error || "Gemini could not read the attached scans.");
        return;
      }
      await saveGeminiDraft(data.si_fields, data.bl_fields, data.model);
    } catch (e) {
      setBusy("");
      setHint(String(e.message || e));
    }
  }

  async function runFiles(kind) {
    if (!siFile || !blFile) {
      setHint("Attach both the shipping instruction and the bill of lading (correct type).");
      return;
    }
    setBusy(kind === "vision" ? "Calling Gemini vision…" : "Reading files…");
    setHint("");
    try {
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
        const saved = saveOverride(rec.email_id, {
          action: "pending_unreadable",
          closed: false,
          note,
          retries,
          status: "NEEDS_REVIEW",
          review_reason: rec.review_reason === "gemini_draft" ? "unreadable" : rec.review_reason || "unreadable",
        });
        setState(saved);
        setRec(mergeRecord(rec, saved));
        return;
      }
      setBusy("");
      await saveGeminiDraft(data.si_fields, data.bl_fields, data.model);
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
          <strong>Pending — unreadable.</strong> Official scoring leaves scans unread on purpose.
          Run Gemini on the attached pair (local bundle), or upload readable files. Confirm before
          the case becomes OK or MISMATCH.
        </div>
      ) : null}

      {reason === "gemini_draft" || rec.extracted_by === "gemini-vision" ? (
        <div className="note">
          <strong>
            <span className="badge hold">Gemini scan</span> Still a comparison request.
          </strong>{" "}
          Check the seven fields. Confirm is the clerk verdict — Done / file report only after that.
          {rec.gemini_model ? <span className="sub"> · {rec.gemini_model}</span> : null}
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

      {(rec.rows && rec.rows.length) || rec.draft_compare?.rows?.length ? (
        <>
          <h2>Comparison{rec.extracted_by === "gemini-vision" ? " (Gemini draft)" : ""}</h2>
          <table className="compare">
            <thead>
              <tr>
                <th>Field</th>
                <th>Shipping instruction</th>
                <th>Bill of lading</th>
              </tr>
            </thead>
            <tbody>
              {(rec.rows?.length ? rec.rows : rec.draft_compare.rows).map((row) => (
                <tr key={row.field} className={row.match === false ? "hit" : ""}>
                  <td className="fld">
                    {FIELD_LABELS[row.field] || row.field}
                    <div className="sub" style={{ fontWeight: 400 }}>
                      {row.match === false
                        ? "Mismatch"
                        : row.match === true
                          ? "Match"
                          : "Not compared"}
                    </div>
                  </td>
                  <td className="si">{row.si || "—"}</td>
                  <td className="bl">{row.bl || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

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

      {reason === "wrong_doc_type" ||
      reason === "unreadable" ||
      reason === "missing_attachment" ||
      reason === "gemini_draft" ||
      !reason ? (
        <div className="note">
          <p>
            {reason === "unreadable" || reason === "gemini_draft"
              ? "Scan the attached originals with Gemini, or replace the pair and analyse."
              : "Replace with the correct pair, then analyse. Confirm is required to leave Pending."}
          </p>
          {(reason === "unreadable" || reason === "gemini_draft") &&
          (rec.attachments || []).length >= 2 ? (
            <p>
              <button
                className="btn"
                type="button"
                onClick={analyseAttachedScans}
                disabled={!!busy}
              >
                Analyse attached scans with Gemini
              </button>
            </p>
          ) : null}
          <p>
            Shipping instruction{" "}
            <input
              type="file"
              accept=".pdf,.txt,image/*"
              onChange={(e) => setSiFile(e.target.files?.[0] || null)}
            />
          </p>
          <p>
            Bill of lading{" "}
            <input
              type="file"
              accept=".pdf,.txt,image/*"
              onChange={(e) => setBlFile(e.target.files?.[0] || null)}
            />
          </p>
          <button className="btn" type="button" onClick={() => runFiles("vision")} disabled={!!busy}>
            Analyse replacement ({retries})
          </button>
          <button
            className="btn"
            type="button"
            onClick={confirmDraft}
            disabled={!rec.draft_compare || state?.action === "clerk_confirmed_compare"}
          >
            Confirm Gemini table and file report
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
