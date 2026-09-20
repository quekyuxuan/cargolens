"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KIND_LABELS, loadOverrides, mailtoResend, saveOverride } from "../../../lib/overrides";
import { CAT_LABELS, FIELD_LABELS, statusClass } from "../../../lib/labels";

export default function CaseActions({ rec }) {
  const [state, setState] = useState(null);
  const [note, setNote] = useState("");
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    const ov = loadOverrides()[rec.email_id];
    setState(ov || null);
    setNote(ov?.note || "");
    setRetries(ov?.retries || 0);
  }, [rec.email_id]);

  function act(action, extra) {
    const saved = saveOverride(rec.email_id, { action, closed: true, note, retries, ...extra });
    setState(saved);
  }

  const reason = rec.review_reason;
  const kinds = rec.file_kinds || [];

  return (
    <main>
      <p className="kicker">
        <Link href="/review">Review queue</Link> / {rec.email_id}
      </p>
      <h1>{rec.subject}</h1>
      <p className="mail-meta">
        From <a href={"mailto:" + (rec.from || "")}>{rec.from || "unknown sender"}</a>
        {" · "}
        {CAT_LABELS[rec.category]} · <span className={"badge " + statusClass(rec.status)}>{rec.status}</span>
        {" · "}
        <span className="badge hold">{reason}</span>
      </p>

      {reason === "wrong_doc_type" ? (
        <div className="note">
          <strong>Wrong document type.</strong> A document-check needs an SI plus a draft BL. One of
          the files is something else (invoice, packing list, certificate). Do not invent a mismatch.
          <ul>
            {kinds.map((f) => (
              <li key={f.path}>
                <code>{(f.path || "").split("/").pop()}</code>
                {" — "}
                {KIND_LABELS[f.kind] || f.kind}
              </li>
            ))}
            {!kinds.length ? <li>Open the attachments on the mail page to inspect headers.</li> : null}
          </ul>
        </div>
      ) : null}

      {reason === "missing_attachment" ? (
        <div className="note">
          <strong>Missing attachment.</strong> Contact the sender and ask them to send the SI and
          draft BL again. Do not compare against an empty pair.
          <div style={{ marginTop: 10 }}>
            Contact: <a href={mailtoResend(rec)}>{rec.from || "no address on file"}</a>
          </div>
        </div>
      ) : null}

      {reason === "unreadable" ? (
        <div className="note">
          <strong>Unreadable file.</strong> Empty, corrupted, or scan-only with no text layer. First
          retry extraction. If it still fails, request a native PDF or a clearer scan. Vision/OCR
          can be tried next; we will not guess fields from a broken file.
        </div>
      ) : null}

      {reason === "missing_value" ? (
        <div className="note">
          <strong>Required value is blank</strong> (??? / TBA / empty). A blank is uncertainty, not a
          discrepancy. Ask the customer to complete the SI, or a clerk can type the value from a
          phone call and then re-compare.
        </div>
      ) : null}

      {rec.body ? (
        <p className="lede" style={{ whiteSpace: "pre-wrap" }}>
          {rec.body}
        </p>
      ) : null}

      <p>
        <Link href={"/mail/" + rec.email_id}>View comparison sheet →</Link>
      </p>

      <h2 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22 }}>Actions</h2>
      {state?.closed ? (
        <p>
          Last action: <span className="badge ok">{state.action}</span>
          {state.note ? " — " + state.note : ""}
        </p>
      ) : null}

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

      {reason === "wrong_doc_type" ? (
        <>
          <button className="btn" type="button" onClick={() => act("requested_correct_bl")}>
            Request the correct draft BL
          </button>
          <button className="btn ghost" type="button" onClick={() => act("confirmed_wrong_doc")}>
            Confirm: keep on hold
          </button>
        </>
      ) : null}

      {reason === "missing_attachment" ? (
        <>
          <a className="btn" href={mailtoResend(rec)}>
            Email sender to resend
          </a>
          <button className="btn ghost" type="button" onClick={() => act("waiting_for_files")}>
            Mark waiting
          </button>
        </>
      ) : null}

      {reason === "unreadable" ? (
        <>
          <button
            className="btn"
            type="button"
            onClick={() => {
              const n = retries + 1;
              setRetries(n);
              act("retry_extraction", { retries: n, closed: false });
            }}
          >
            Retry extraction ({retries})
          </button>
          <button className="btn ghost" type="button" onClick={() => act("requested_clean_scan")}>
            Request a clean scan / native PDF
          </button>
          <button className="btn ghost" type="button" onClick={() => act("queue_vision_ocr")}>
            Queue vision / OCR (next build)
          </button>
        </>
      ) : null}

      {reason === "missing_value" ? (
        <>
          <button className="btn" type="button" onClick={() => act("asked_customer_to_complete")}>
            Ask customer to complete SI
          </button>
          <button className="btn ghost" type="button" onClick={() => act("clerk_will_fill_value")}>
            Clerk will type the missing value
          </button>
        </>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <button className="btn ghost" type="button" onClick={() => act("confirmed_engine")}>
          Agree with engine (close)
        </button>
      </div>
    </main>
  );
}
