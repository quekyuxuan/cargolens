/** Browser port of engine/extract_bin.py. */
import JSZip from "jszip";
import { extractTextFields } from "./extract-txt";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

function decoder(data) {
  return new TextDecoder("utf-8").decode(data);
}

export async function attachmentToText(name, data) {
  const lower = (name || "").toLowerCase();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data || []);
  if (lower.endsWith(".txt") || lower.endsWith(".csv")) return decoder(bytes);
  if (lower.endsWith(".pdf")) return pdfToText(bytes);
  if (lower.endsWith(".docx")) return docxToText(bytes);
  if (lower.endsWith(".xlsx")) return xlsxToText(bytes);
  if (/\.(png|jpe?g|webp|gif|tif{1,2})$/.test(lower)) return "";
  try {
    return decoder(bytes);
  } catch (e) {
    return "";
  }
}

export async function extractAttachment(name, data) {
  const text = await attachmentToText(name, data);
  return { text, fields: extractTextFields(text) };
}

function localName(el) {
  return (el.localName || el.tagName || "").replace(/^.*:/, "");
}

function childrenNamed(el, name) {
  return [...(el.children || [])].filter((c) => localName(c) === name);
}

function parseXml(xml) {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function docxRunText(run) {
  let out = "";
  for (const node of run.children || []) {
    const n = localName(node);
    if (n === "t") out += node.textContent || "";
    else if (n === "br" || n === "cr") out += "\n";
    else if (n === "tab") out += "\t";
  }
  return out;
}

function docxParaText(p) {
  const runs = p.getElementsByTagNameNS(W, "r");
  return [...runs].map(docxRunText).join("");
}

async function docxToText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file("word/document.xml");
  if (!file) return "";
  const doc = parseXml(await file.async("string"));
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) return "";
  const parts = [];
  for (const p of childrenNamed(body, "p")) parts.push(docxParaText(p));
  for (const table of body.getElementsByTagNameNS(W, "tbl")) {
    for (const row of table.getElementsByTagNameNS(W, "tr")) {
      const cells = [...row.getElementsByTagNameNS(W, "tc")].map((tc) =>
        [...tc.getElementsByTagNameNS(W, "p")].map(docxParaText).join("\n").trim()
      );
      if (cells.length >= 2) parts.push(cells[0] + ": " + cells[1]);
      else parts.push(cells.join(" | "));
    }
  }
  return parts.join("\n");
}

function cellRefRow(r) {
  const m = String(r || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function cellRefCol(r) {
  const m = String(r || "").match(/^[A-Z]+/i);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[0].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

async function xlsxToText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const ssFile = zip.file("xl/sharedStrings.xml");
  const strings = [];
  if (ssFile) {
    const ssDoc = parseXml(await ssFile.async("string"));
    for (const si of ssDoc.getElementsByTagNameNS(MAIN, "si")) strings.push(si.textContent || "");
  }
  const sheetNames = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(n))
    .sort();
  const lines = [];
  for (const path of sheetNames) {
    const sheetDoc = parseXml(await zip.file(path).async("string"));
    const rows = new Map();
    for (const c of sheetDoc.getElementsByTagNameNS(MAIN, "c")) {
      const ref = c.getAttribute("r") || "";
      const t = c.getAttribute("t");
      const v = c.getElementsByTagNameNS(MAIN, "v")[0];
      let val = v ? v.textContent || "" : "";
      if (t === "s") val = strings[parseInt(val, 10)] || "";
      const row = cellRefRow(ref);
      const col = cellRefCol(ref);
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row)[col - 1] = val;
    }
    for (const r of [...rows.keys()].sort((a, b) => a - b)) {
      const cells = (rows.get(r) || []).map((c) => (c == null ? "" : String(c)));
      if (cells.length >= 2 && cells[0]) lines.push(String(cells[0]) + ": " + String(cells[1]));
      else if (cells.some(Boolean)) lines.push(cells.join(" "));
    }
  }
  return lines.join("\n");
}

async function pdfToText(bytes) {
  const pdfjs = await import("pdfjs-dist/build/pdf");
  if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + pdfjs.version + "/pdf.worker.min.js";
  }
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let lastY = null;
    let buf = "";
    for (const item of tc.items) {
      const y = item.transform ? item.transform[5] : 0;
      if (lastY != null && Math.abs(y - lastY) > 2) buf += "\n";
      else if (buf && !buf.endsWith("\n") && !buf.endsWith(" ")) buf += " ";
      buf += item.str || "";
      lastY = y;
    }
    pages.push(buf);
  }
  return pages.join("\n");
}
