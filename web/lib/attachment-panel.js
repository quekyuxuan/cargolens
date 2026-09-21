"use client";

import { useState } from "react";
import { KIND_LABELS } from "../lib/overrides";

export default function AttachmentPanel({ rec }) {
  const views = rec.attachment_views || [];
  const paths = rec.attachments || [];
  const items = views.length
    ? views
    : paths.map((p) => ({
        path: p,
        name: (p || "").split("/").pop(),
        kind: "unknown",
        text: "",
      }));

  if (!items.length) {
    return <p className="lede">No attachments on this message.</p>;
  }

  return (
    <div>
      <h2>Attachments</h2>
      {items.map((f) => (
        <AttachmentCard key={f.path || f.name} file={f} />
      ))}
    </div>
  );
}

function AttachmentCard({ file }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const href = "/api/files?path=" + encodeURIComponent(file.path || "");

  async function openOriginal() {
    setNote("");
    try {
      const res = await fetch(href);
      if (res.ok) {
        window.open(href, "_blank", "noopener");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setNote(
        data.hint ||
          "The original file is not on this host. The hackathon attachments are the organizer's data, so they are not published with the site."
      );
      setOpen(true);
    } catch (e) {
      setNote(String(e));
      setOpen(true);
    }
  }

  return (
    <div className="note">
      <p style={{ margin: "0 0 8px" }}>
        <strong>{file.name}</strong>
        {" · "}
        {KIND_LABELS[file.kind] || file.kind}
        {file.bytes ? " · " + file.bytes + " bytes" : ""}
        {" · "}
        <button
          className="btn ghost"
          type="button"
          style={{ padding: "2px 8px" }}
          onClick={openOriginal}
        >
          Open original
        </button>
        {file.text ? (
          <button
            className="btn ghost"
            type="button"
            style={{ padding: "2px 8px" }}
            onClick={() => setOpen(!open)}
          >
            {open ? "Hide text" : "Show extracted text"}
          </button>
        ) : null}
      </p>
      {note ? <p style={{ margin: "0 0 8px", fontSize: 13 }}>{note}</p> : null}
      {file.text ? (
        open ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 280, overflow: "auto", margin: 0 }}>
            {file.text}
          </pre>
        ) : null
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          No text layer: scan-only or corrupted. On Review, use{" "}
          <strong>Analyse attached scans with Gemini</strong> (needs the local organizer ZIP), or
          upload the PDFs / use Demo.
        </p>
      )}
    </div>
  );
}
