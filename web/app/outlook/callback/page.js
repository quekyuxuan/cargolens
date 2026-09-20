"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OutlookCallback() {
  const [msg, setMsg] = useState("Finishing handshake…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error_description") || params.get("error");
    if (err) {
      setMsg(err);
      return;
    }
    const code = params.get("code");
    const clientId = localStorage.getItem("cargolens-graph-client");
    const tenant = localStorage.getItem("cargolens-graph-tenant") || "common";
    const verifier = sessionStorage.getItem("cargolens-pkce");
    if (!code || !clientId || !verifier) {
      setMsg("Missing code or client id. Start from /outlook.");
      return;
    }
    const redirect = window.location.origin + "/outlook/callback";
    fetch("https://login.microsoftonline.com/" + encodeURIComponent(tenant) + "/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
        code_verifier: verifier,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.access_token) {
          sessionStorage.setItem("cargolens-graph-token", data.access_token);
          window.location.replace("/outlook");
        } else {
          setMsg(data.error_description || JSON.stringify(data));
        }
      })
      .catch((e) => setMsg(String(e)));
  }, []);

  return (
    <main>
      <p className="kicker">Outlook</p>
      <h1>Connecting</h1>
      <p className="lede">{msg}</p>
      <Link href="/outlook">Back</Link>
    </main>
  );
}
