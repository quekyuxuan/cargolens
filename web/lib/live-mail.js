export const LIVE_KEY = "cargolens-live-mail";

export function loadLiveMail() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIVE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

export function saveLiveMail(list) {
  localStorage.setItem(LIVE_KEY, JSON.stringify(list));
}

export function upsertLive(rec) {
  const list = loadLiveMail().filter((r) => r.email_id !== rec.email_id);
  list.unshift(rec);
  saveLiveMail(list);
  return list;
}
