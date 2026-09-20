export const LS_CLIENT = "cargolens-graph-client";
export const LS_TENANT = "cargolens-graph-tenant";
export const SS_TOKEN = "cargolens-graph-token";
export const SS_PKCE = "cargolens-pkce";

export const SCOPES = "openid offline_access User.Read Mail.Read";

export function randomString(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ("0" + b.toString(16)).slice(-2)).join("");
}

export function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((value || "").trim());
}

export async function pkce() {
  const verifier = randomString(32);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

export function redirectUri() {
  return window.location.origin + "/outlook/callback";
}

export function authorizeUrl({ clientId, tenant, challenge, state }) {
  return (
    "https://login.microsoftonline.com/" +
    encodeURIComponent(tenant || "common") +
    "/oauth2/v2.0/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri(),
      response_mode: "query",
      scope: SCOPES,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    })
  );
}

// Azure returns this when the app is registered as "Web" instead of "Single-page application",
// which is the mistake that costs the most time.
export function explainAzureError(raw) {
  const text = String(raw || "");
  if (text.includes("AADSTS9002326") || text.toLowerCase().includes("cross-origin token redemption")) {
    return (
      "Azure rejected the browser token exchange. In the app registration, the redirect URI must sit " +
      "under Authentication → Single-page application, not Web. Delete it from Web and re-add it there."
    );
  }
  if (text.includes("AADSTS50011") || text.toLowerCase().includes("redirect uri")) {
    return "The redirect URI does not match Azure. It must be exactly " + safeRedirect() + ".";
  }
  if (text.includes("AADSTS700016") || text.toLowerCase().includes("was not found in the directory")) {
    return "That client ID does not exist in this tenant. Check the ID, or switch tenant to 'common'.";
  }
  if (text.includes("AADSTS65001") || text.toLowerCase().includes("consent")) {
    return "Nobody has consented to Mail.Read yet. Grant it in Azure → API permissions, or accept the prompt.";
  }
  return text;
}

function safeRedirect() {
  try {
    return redirectUri();
  } catch (e) {
    return "<site>/outlook/callback";
  }
}

export async function graph(path, token) {
  const res = await fetch("https://graph.microsoft.com/v1.0" + path, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem(SS_TOKEN);
    throw new Error("Microsoft session expired. Sign in again.");
  }
  if (!res.ok) throw new Error(data.error?.message || "Graph error " + res.status);
  return data;
}
