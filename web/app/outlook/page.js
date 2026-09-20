"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { upsertLive } from "../../lib/live-mail";

const LS_CLIENT = "cargolens-graph-client";
const LS_TENANT = "cargolens-graph-tenant";

function randomString(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ("0" + b.toString(16)).slice(-2)).join("");
}

async function pkce() {
  const verifier = randomString(32);
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

export default function OutlookPage() {
  const [clientId, setClientId] = useState("");
  const [tenant, setTenant] = useState("common");
  const [token, setToken] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [err, setErr] = useState("");
  const [siFile, setSiFile] = useState(null);
  const [blFile, setBlFile] = useState(null);
  const [subject, setSubject] = useState("Manual upload — document check");

  useEffect(() => {
    setClientId(localStorage.getItem(LS_CLIENT) || "");
    setTenant(localStorage.getItem(LS_TENANT) || "common");
    setToken(sessionStorage.getItem("cargolens-graph-token") || "");
  }, []);

  async function connect() {
    localStorage.setItem(LS_CLIENT, clientId.trim());
    localStorage.setItem(LS_TENANT, tenant.trim() || "common");
    const { verifier, challenge } = await pkce();
    sessionStorage.setItem("cargolens-pkce", verifier);
    const redirect = window.location.origin + "/outlook/callback";
    const url =
      "https://login.microsoftonline.com/" +
      encodeURIComponent(tenant.trim() || "common") +
      "/oauth2/v2.0/authorize?" +
      new URLSearchParams({
        client_id: clientId.trim(),
        response_type: "code",
        redirect_uri: redirect,
        response_mode: "query",
        scope: "openid offline_access User.Read Mail.Read",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: randomString(8),
      });
    window.location.href = url;
  }

  async function loadMail() {
    setErr("");
    const res = await fetch(
      "https://graph.microsoft.com/v1.0/me/messages?$top=12&$select=id,subject,from,receivedDateTime,hasAttachments,bodyPreview",
      { headers: { Authorization: "Bearer " + token } }
    );
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error?.message || "Graph error");
      return;
    }
    setMsgs(data.value || []);
  }

  async function importMsg(m) {
    setErr("");
    const attRes = await fetch("https://graph.microsoft.com/v1.0/me/messages/" + m.id + "/attachments", {
      headers: { Authorization: "Bearer " + token },
    });
    const att = await attRes.json();
    const files = (att.value || []).filter((a) => a["@odata.type"] === "#microsoft.graph.fileAttachment");
    const rec = {
      email_id: "outlook_" + m.id.slice(0, 8),
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      category: "BL_COMPARISON",
      decided_by: "outlook-ingest",
      status: files.length >= 2 ? "NEEDS_REVIEW" : "NEEDS_REVIEW",
      review_reason: files.length >= 2 ? "unreadable" : "missing_attachment",
      has_defect: false,
      defect_fields: [],
      rows: [],
      body: m.bodyPreview,
      attachments: files.map((f) => f.name),
      file_kinds: files.map((f) => ({ path: f.name, kind: "unknown" })),
      source: "outlook",
    };
    upsertLive(rec);
    window.location.href = "/review/" + rec.email_id;
  }

  function dropManual() {
    if (!siFile || !blFile) {
      setErr("Choose SI and bill of lading files.");
      return;
    }
    const rec = {
      email_id: "live_" + Date.now(),
      subject,
      from: "upload",
      category: "BL_COMPARISON",
      decided_by: "manual-upload",
      status: "NEEDS_REVIEW",
      review_reason: "unreadable",
      has_defect: false,
      defect_fields: [],
      rows: [],
      file_kinds: [
        { path: siFile.name, kind: "SI" },
        { path: blFile.name, kind: "BL" },
      ],
      source: "upload",
    };
    upsertLive(rec);
    window.location.href = "/review/" + rec.email_id;
  }

  return (
    <main>
      <p className="kicker">Microsoft Graph · Mail.Read</p>
      <h1>Outlook inbox</h1>
      <p className="lede">
        Register a public SPA in Azure (free student / personal account works). Redirect URI must be
        this site <code>/outlook/callback</code>. Client ID stays in your browser, not the repo.
      </p>

      <div className="note">
        <p>
          Application (client) ID
          <br />
          <input className="search" style={{ width: "100%", maxWidth: 480 }} value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </p>
        <p>
          Tenant (<code>common</code> or a directory id)
          <br />
          <input className="search" value={tenant} onChange={(e) => setTenant(e.target.value)} />
        </p>
        <button className="btn" type="button" onClick={connect} disabled={!clientId.trim()}>
          Sign in with Microsoft
        </button>
        {token ? (
          <button className="btn ghost" type="button" onClick={loadMail}>
            List recent mail
          </button>
        ) : null}
      </div>

      {err ? <div className="note">{err}</div> : null}

      {msgs.length ? (
        <table className="grid">
          <thead>
            <tr>
              <th>Subject</th>
              <th>From</th>
              <th>Attachments</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {msgs.map((m) => (
              <tr key={m.id}>
                <td>{m.subject}</td>
                <td>{m.from?.emailAddress?.address}</td>
                <td>{m.hasAttachments ? "yes" : "no"}</td>
                <td>
                  <button className="btn" type="button" onClick={() => importMsg(m)}>
                    Import
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>No Azure yet — drop files</h2>
      <p className="lede">Creates a live case. Then Retry with Gemini vision on the review page.</p>
      <p>
        Subject
        <br />
        <input className="search" style={{ width: "100%", maxWidth: 480 }} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </p>
      <p>
        SI <input type="file" accept=".pdf,image/*" onChange={(e) => setSiFile(e.target.files?.[0] || null)} />
      </p>
      <p>
        Bill of lading <input type="file" accept=".pdf,image/*" onChange={(e) => setBlFile(e.target.files?.[0] || null)} />
      </p>
      <button className="btn" type="button" onClick={dropManual}>
        Create live case
      </button>
      <p className="lede">
        <Link href="/incoming">How ingest maps to the engine</Link>
      </p>
    </main>
  );
}
