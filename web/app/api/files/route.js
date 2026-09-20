import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOTS = [
  process.env.SDOC_DATA,
  "C:\\Users\\yu xuan\\Downloads\\sdoc-hackathon-bundle",
];

function mime(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (n.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(req) {
  const rel = new URL(req.url).searchParams.get("path") || "";
  const safe = rel.replace(/\\/g, "/");
  if (!safe || safe.includes("..") || !safe.startsWith("attachments/")) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 });
  }
  for (const root of ROOTS) {
    if (!root) continue;
    const full = path.join(root, ...safe.split("/"));
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const buf = fs.readFileSync(full);
      const name = path.basename(full);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": mime(name),
          "Content-Disposition": 'inline; filename="' + name + '"',
        },
      });
    }
  }
  return NextResponse.json(
    { error: "not_on_this_host", hint: "Original files live in the official ZIP. On Vercel only extracted text is shown." },
    { status: 404 }
  );
}
