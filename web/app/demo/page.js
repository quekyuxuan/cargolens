"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAT_LABELS, FIELD_LABELS, displayStatus, statusClass } from "../../lib/labels";
import { upsertLive } from "../../lib/live-mail";
import { saveOverride } from "../../lib/overrides";
import { fileToBytes, processDemo } from "../../lib/process-email";

export default function DemoPage() {
  const router = useRouter();
  const [jsonFile, setJsonFile] = useState(null);
  const [siFile, setSiFile] = useState(null);
  const [blFile, setBlFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [rec, setRec] = useState(null);
  const [done, setDone] = useState(false);

  async function run() {
    setErr("");
    setDone(false);
    if (!jsonFile) {
      setErr("Upload an email JSON first — any file from the official inbox folder works.");
      return;
    }
    setBusy("Reading…");
    try {
      const raw = JSON.parse(await jsonFile.text());
      if (!raw || typeof raw !== "object") throw new Error("Not an email object");
      const origId = raw.email_id || jsonFile.name.replace(/\.json$/i, "");
      const email = {
        email_id: "demo_" + origId,
        subject: raw.subject || "(no subject)",
        from: raw.from || "",
        body: raw.body || "",
        attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
      };
      const files = [];
      if (siFile) files.push(await fileToBytes(siFile));
      if (blFile) files.push(await fileToBytes(blFile));
      setBusy("Classifying" + (files.length ? " and comparing…" : "…"));
      const result = await processDemo(email, files);
      result.demo_source = origId;
      setRec(result);
      setBusy("");
    } catch (e) {
      setBusy("");
      setErr(String(e.message || e));
    }
  }

  function markDone() {
    if (!rec) return;
    upsertLive({ ...rec, reviewed: true });
    saveOverride(rec.email_id, { reviewed: true, action: "demo_done", closed: true });
    setDone(true);
    router.push("/reviewed");
  }

  function reset() {
    setRec(null);
    setDone(false);
    setErr("");
    setJsonFile(null);
    setSiFile(null);
    setBlFile(null);
  }

  return (
    <main>
      <p className="kicker">Judge upload</p>
      <h1>Demo</h1>
      <p className="lede">
        Drop an official email JSON — comparison request, invoice, spam, general, anything in the
        pack. Attach the shipping instruction and bill of lading only if you have them. The same
        rules as the 520-email run classify it; comparison runs only on comparison requests. Text,
        Excel, Word, and PDFs with a text layer are read here. Scans go to Gemini.
      </p>

      <div className="filters" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
        <label className="sel">
          Email JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
          />
        </label>
        <label className="sel">
          Shipping instruction (optional)
          <input
            type="file"
            accept=".pdf,.txt,.docx,.xlsx,image/*"
            onChange={(e) => setSiFile(e.target.files?.[0] || null)}
          />
        </label>
        <label className="sel">
          Bill of lading (optional)
          <input
            type="file"
            accept=".pdf,.txt,.docx,.xlsx,image/*"
            onChange={(e) => setBlFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      <p>
        <button className="btn" type="button" onClick={run} disabled={!!busy}>
          Run
        </button>
        {rec ? (
          <button className="btn ghost" type="button" onClick={reset}>
            Try another
          </button>
        ) : null}
      </p>
      {busy ? <p className="count">{busy}</p> : null}
      {err ? <div className="note">{err}</div> : null}

      {jsonFile ? (
        <p className="count">
          {jsonFile.name}
          {siFile ? " · SI " + siFile.name : ""}
          {blFile ? " · BL " + blFile.name : ""}
        </p>
      ) : (
        <p className="count">Example: inbox/email_001.json plus email_001_SI.txt and email_001_BL.txt</p>
      )}

      {rec ? (
        <>
          <h2>{rec.subject}</h2>
          <p className="mail-meta">
            {rec.demo_source ? rec.demo_source + " · " : ""}
            From {rec.from || "—"} · {CAT_LABELS[rec.category] || rec.category}
            {" · "}
            <span className={"badge " + statusClass(rec.status)}>{displayStatus(rec.status)}</span>
            {rec.extracted_by === "gemini-vision" ? " · read by Gemini" : null}
            {rec.extracted_by === "rules" ? " · read by rules" : null}
          </p>
          {rec.body ? <p className="body-text">{rec.body}</p> : null}
          {rec.notes && rec.notes.length ? (
            <div className="note">{rec.notes.join(" ")}</div>
          ) : null}
          {rec.review_reason ? (
            <p className="count">Pending reason: {rec.review_reason}</p>
          ) : null}

          {rec.rows && rec.rows.length ? (
            <table className="compare">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Shipping instruction</th>
                  <th>Bill of lading</th>
                </tr>
              </thead>
              <tbody>
                {rec.rows.map((row) => (
                  <tr key={row.field} className={row.match === false ? "hit" : ""}>
                    <td className="fld">
                      {FIELD_LABELS[row.field] || row.field}
                      <div className="sub" style={{ fontWeight: 400 }}>
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
            <p className="lede">
              Classified as a comparison request. No SI / bill of lading pair was compared
              {rec.review_reason ? " — " + rec.review_reason.replace(/_/g, " ") : ""}.
            </p>
          ) : (
            <p className="lede">Not a comparison request — classified only. No field check.</p>
          )}

          <div className="note actions">
            {done ? (
              <>
                Filed on <Link href="/reviewed">Reviewed</Link>.
              </>
            ) : (
              <>
                Staff check finished? Mark Done to archive this demo case.
                <div style={{ marginTop: 10 }}>
                  <button className="btn" type="button" onClick={markDone}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}
    </main>
  );
}
