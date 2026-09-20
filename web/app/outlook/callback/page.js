"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  explainAzureError,
  LS_CLIENT,
  LS_TENANT,
  redirectUri,
  SCOPES,
  SS_PKCE,
  SS_TOKEN,
} from "../../../lib/graph";

export default function OutlookCallback() {
  const [msg, setMsg] = useState("Finishing the Microsoft handshake…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const failed = params.get("error_description") || params.get("error");
    if (failed) {
      setMsg(explainAzureError(failed));
      return;
    }

    const code = params.get("code");
    const clientId = localStorage.getItem(LS_CLIENT);
    const tenant = localStorage.getItem(LS_TENANT) || "common";
    const verifier = sessionStorage.getItem(SS_PKCE);
    if (!code || !clientId || !verifier) {
      setMsg("Missing code or client ID. Start again from the Outlook page.");
      return;
    }

    fetch("https://login.microsoftonline.com/" + encodeURIComponent(tenant) + "/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
        scope: SCOPES,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.access_token) {
          sessionStorage.setItem(SS_TOKEN, data.access_token);
          sessionStorage.removeItem(SS_PKCE);
          window.location.replace("/outlook");
          return;
        }
        setMsg(explainAzureError(data.error_description || data.error || JSON.stringify(data)));
      })
      .catch((e) =>
        setMsg(
          explainAzureError(
            String(e) +
              " — a network failure here usually means the redirect URI is registered under Web " +
              "instead of Single-page application, so the browser call is blocked by CORS."
          )
        )
      );
  }, []);

  return (
    <main>
      <p className="kicker">Outlook</p>
      <h1>Connecting</h1>
      <p className="lede">{msg}</p>
      <Link href="/outlook">Back to Outlook</Link>
    </main>
  );
}
