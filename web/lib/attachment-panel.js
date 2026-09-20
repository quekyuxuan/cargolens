"use client";

import { useEffect, useState } from "react";
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
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Attachments</h2>
      {items.map((f) => (
        <AttachmentCard key={f.path || f.name} file={f} />
      ))}
    </div>
  );
}

function AttachmentCard({ file }) {
  const [open, setOpen] = useState(false);
  const href = "/api/files?path=" + encodeURIComponent(file.path || "");
  return (
    <div className="note" style={{ background: "#fffdf8" }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>{file.name}</strong>
        {" · "}
        {KIND_LABELS[file.kind] || file.kind}
        {file.bytes ? " · " + file.bytes + " bytes" : ""}
        {" · "}
        <a href={href} target="_blank" rel="noreferrer">
          Open original
        </a>
        {file.text ? (
          <>
            {" · "}
            <button className="btn ghost" type="button" onClick={() => setOpen(!open)}>
              {open ? "Hide text" : "Show extracted text"}
            </button>
          </>
        ) : null}
      </p>
      {open && file.text ? (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 280, overflow: "auto", margin: 0 }}>
          {file.text}
        </pre>
      ) : null}
    </div>
  );
}
