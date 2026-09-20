import { NextResponse } from "next/server";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const FIELDS = [
  "shipper",
  "consignee",
  "notify_party",
  "port_of_loading",
  "port_of_discharge",
  "container_count",
  "gross_weight_kg",
];

export async function POST(req) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "missing_key",
        hint: "Add GEMINI_API_KEY in Vercel env, or run locally: python run.py --only email_511 --vision",
      },
      { status: 501 }
    );
  }
  const body = await req.json();
  const si = body.si;
  const bl = body.bl;
  if (!si || !bl) {
    return NextResponse.json(
      { error: "need_files", hint: "Upload both SI and BL (image or PDF) to retry with vision." },
      { status: 400 }
    );
  }
  const siFields = await geminiExtract(key, si, body.siName || "si.pdf");
  const blFields = await geminiExtract(key, bl, body.blName || "bl.pdf");
  return NextResponse.json({ si_fields: siFields, bl_fields: blFields, extracted_by: "gemini-vision" });
}

async function geminiExtract(key, base64, name) {
  const mime = name.toLowerCase().endsWith(".png")
    ? "image/png"
    : name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "application/pdf";
  const prompt =
    "Read this shipping document. Return ONLY JSON with keys: " +
    FIELDS.join(", ") +
    ". Use null if unreadable. Do not invent values.";
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + key,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: base64 } }],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    }
  );
  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}") + 1;
  if (start < 0) return {};
  try {
    return JSON.parse(text.slice(start, end));
  } catch (e) {
    return {};
  }
}
