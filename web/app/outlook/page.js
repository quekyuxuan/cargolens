"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { upsertLive } from "../../lib/live-mail";
import { compareFields } from "../../lib/compare";
import {
  authorizeUrl,
  explainAzureError,
  graph,
  isGuid,
  LS_CLIENT,
  LS_TENANT,
  pkce,
  randomString,
  redirectUri,
  SS_PKCE,
  SS_TOKEN,
} from "../../lib/graph";

function pickPair(files) {
  const si = files.find((f) => /(^|[_\-\s])si([_\-.\s]|$)|shipping.?instruction/i.test(f.name));
  const bl = files.find(
    (f) => f !== si && /(^|[_\-\s])bl([_\-.\s]|$)|bill.?of.?lading/i.test(f.name)
  );
  if (si && bl) return [si, bl];
  return [files[0], files.find((f) => f !== files[0])];
}

export default function OutlookPage() {
  const [clientId, setClientId] = useState("");
  const [tenant, setTenant] = useState("common");
  const [token, setToken] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [redirect, setRedirect] = useState("");
  const [siFile, setSiFile] = useState(null);
  const [blFile, setBlFile] = useState(null);
  const [subject, setSubject] = useState("Manual upload — document check");

  useEffect(() => {
    setClientId(localStorage.getItem(LS_CLIENT) || "");
    setTenant(localStorage.getItem(LS_TENANT) || "common");
    setToken(sessionStorage.getItem(SS_TOKEN) || "");
    setRedirect(redirectUri());
  }, []);

  async function connect() {
    const id = clientId.trim();
    if (!isGuid(id)) {
      setErr("The Application (client) ID should look like 00000000-0000-0000-0000-000000000000.");
      return;
    }
    setErr("");
    localStorage.setItem(LS_CLIENT, id);
    localStorage.setItem(LS_TENANT, tenant.trim() || "common");
    const { verifier, challenge } = await pkce();
    sessionStorage.setItem(SS_PKCE, verifier);
    window.location.href = authorizeUrl({
      clientId: id,
      tenant: tenant.trim() || "common",
      challenge,
      state: randomString(8),
    });
  }

  function signOut() {
    sessionStorage.removeItem(SS_TOKEN);
    setToken("");
    setMsgs([]);
  }

  async function loadMail() {
    setErr("");
    setBusy("Reading your inbox…");
    try {
      const data = await graph(
        "/me/messages?$top=15&$select=id,subject,from,receivedDateTime,hasAttachments,bodyPreview",
        token
      );
      setMsgs(data.value || []);
      if (!(data.value || []).length) setErr("No messages returned.");
    } catch (e) {
      setErr(explainAzureError(e.message));
      if (/expired/i.test(e.message)) setToken("");
    } finally {
      setBusy("");
    }
  }

  async function importMsg(m) {
    setErr("");
    setBusy("Downloading attachments…");
    const id = "outlook_" + m.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const base = {
      email_id: id,
      subject: m.subject || "(no subject)",
      from: m.from?.emailAddress?.address || "",
      category: "BL_COMPARISON",
      decided_by: "outlook-ingest",
      has_defect: false,
      defect_fields: [],
      rows: [],
      body: m.bodyPreview || "",
      source: "outlook",
    };

    try {
      const att = await graph("/me/messages/" + m.id + "/attachments", token);
      const files = (att.value || []).filter(
        (a) => a["@odata.type"] === "#microsoft.graph.fileAttachment"
      );

      if (files.length < 2) {
        upsertLive({
          ...base,
          status: "NEEDS_REVIEW",
          review_reason: "missing_attachment",
          attachments: files.map((f) => f.name),
          file_kinds: files.map((f) => ({ path: f.name, kind: "unknown" })),
        });
        window.location.href = "/review/" + id;
        return;
      }

      const [si, bl] = pickPair(files);
      setBusy("Reading the pair with Gemini…");
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          si: si.contentBytes,
          bl: bl.contentBytes,
          siName: si.name,
          blName: bl.name,
        }),
      });
      const data = await res.json();

      const shared = {
        ...base,
        attachments: [si.name, bl.name],
        file_kinds: [
          { path: si.name, kind: "SI" },
          { path: bl.name, kind: "BL" },
        ],
        status: "NEEDS_REVIEW",
      };

      if (!res.ok) {
        upsertLive({ ...shared, review_reason: "unreadable", notes: [data.hint || data.error] });
      } else {
        // Gemini only reads the fields. Code compares them, and a clerk still confirms.
        const cmp = compareFields(data.si_fields, data.bl_fields);
        upsertLive({
          ...shared,
          review_reason: null,
          extracted_by: "gemini-vision",
          si_fields: data.si_fields,
          bl_fields: data.bl_fields,
          rows: cmp.rows,
          draft_compare: cmp,
        });
      }
      window.location.href = "/review/" + id;
    } catch (e) {
      setBusy("");
      setErr(explainAzureError(e.message));
    }
  }

  function dropManual() {
    if (!siFile || !blFile) {
      setErr("Choose an SI and a bill of lading.");
      return;
    }
    const id = "live_" + Date.now();
    upsertLive({
      email_id: id,
      subject,
      from: "upload",
      category: "BL_COMPARISON",
      decided_by: "manual-upload",
      status: "NEEDS_REVIEW",
      review_reason: "unreadable",
      has_defect: false,
      defect_fields: [],
      rows: [],
      attachments: [siFile.name, blFile.name],
      file_kinds: [
        { path: siFile.name, kind: "SI" },
        { path: blFile.name, kind: "BL" },
      ],
      source: "upload",
    });
    window.location.href = "/review/" + id;
  }

  return (
    <main>
      <p className="kicker">Microsoft Graph · Mail.Read</p>
      <h1>Outlook inbox</h1>
      <p className="lede">
        Import a real message, read the pair, compare the seven fields, and land it in the review
        queue for confirmation. Your client ID stays in this browser; nothing is committed.
      </p>

      <div className="note">
        <strong>One-time Azure setup</strong>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>
            portal.azure.com → App registrations → New registration. Accounts: personal + work is
            fine.
          </li>
          <li>
            Authentication → Add a platform → <strong>Single-page application</strong> (not Web) →
            redirect URI <code>{redirect || "<site>/outlook/callback"}</code>
          </li>
          <li>API permissions → Microsoft Graph → Delegated → <code>Mail.Read</code></li>
          <li>Copy the Application (client) ID into the box below.</li>
        </ol>
      </div>

      <div className="note">
        <p>
          Application (client) ID
          <br />
          <input
            className="search"
            style={{ width: "100%", maxWidth: 480 }}
            placeholder="00000000-0000-0000-0000-000000000000"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </p>
        <p>
          Tenant (<code>common</code> or a directory id)
          <br />
          <input className="search" value={tenant} onChange={(e) => setTenant(e.target.value)} />
        </p>
        {token ? (
          <>
            <span className="badge ok">connected</span>{" "}
            <button className="btn" type="button" onClick={loadMail} disabled={!!busy}>
              List recent mail
            </button>
            <button className="btn ghost" type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn" type="button" onClick={connect}>
            Sign in with Microsoft
          </button>
        )}
      </div>

      {busy ? <p>{busy}</p> : null}
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
                  <button
                    className="btn"
                    type="button"
                    onClick={() => importMsg(m)}
                    disabled={!!busy}
                  >
                    Import
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>No Azure yet — drop files</h2>
      <p className="lede">
        Creates the same kind of live case. Analyse it on the review page, then confirm.
      </p>
      <p>
        Subject
        <br />
        <input
          className="search"
          style={{ width: "100%", maxWidth: 480 }}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </p>
      <p>
        Shipping instruction{" "}
        <input type="file" accept=".pdf,.txt,image/*" onChange={(e) => setSiFile(e.target.files?.[0] || null)} />
      </p>
      <p>
        Bill of lading{" "}
        <input type="file" accept=".pdf,.txt,image/*" onChange={(e) => setBlFile(e.target.files?.[0] || null)} />
      </p>
      <button className="btn" type="button" onClick={dropManual}>
        Create live case
      </button>
      <p className="lede" style={{ marginTop: 20 }}>
        <Link href="/incoming">How ingest maps to the engine</Link>
      </p>
    </main>
  );
}
