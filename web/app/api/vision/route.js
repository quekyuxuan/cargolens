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
        hint:
          "No GEMINI_API_KEY on this deployment. Add it in Vercel → Settings → Environment Variables, " +
          "or run locally: python run.py --only email_512 --vision",
      },
      { status: 501 }
    );
  }

  const body = await req.json();
  if (!body.si || !body.bl) {
    return NextResponse.json(
      { error: "need_files", hint: "Attach both the shipping instruction and the bill of lading." },
      { status: 400 }
    );
  }

  const si = await geminiExtract(key, body.si, body.siName || "si.pdf");
  const bl = await geminiExtract(key, body.bl, body.blName || "bl.pdf");

  if (!si.fields || !bl.fields) {
    // Never hide the upstream reason: a retired model or an exhausted quota looks
    // exactly like an unreadable document otherwise.
    return NextResponse.json(
      {
        error: "vision_failed",
        hint: "Gemini could not read the pair. SI: " + (si.error || "ok") + " · BL: " + (bl.error || "ok"),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    si_fields: si.fields,
    bl_fields: bl.fields,
    extracted_by: "gemini-vision",
    model: MODEL,
  });
}

function mimeOf(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".txt")) return "text/plain";
  return "application/pdf";
}

async function geminiExtract(key, base64, name) {
  const prompt =
    "Read this shipping document. Return ONLY JSON with keys: " +
    FIELDS.join(", ") +
    ". Use null if a field is unreadable. Do not invent values.";

  let payload;
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, { inline_data: { mime_type: mimeOf(name), data: base64 } }],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      }
    );
    payload = await res.json();
    if (!res.ok) {
      return { fields: null, error: payload?.error?.message || "HTTP " + res.status };
    }
  } catch (e) {
    return { fields: null, error: String(e) };
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}") + 1;
  if (start < 0) return { fields: null, error: "model returned no JSON" };

  let raw;
  try {
    raw = JSON.parse(text.slice(start, end));
  } catch (e) {
    return { fields: null, error: "model returned invalid JSON" };
  }

  const fields = {};
  let filled = 0;
  for (const f of FIELDS) {
    const v = raw[f];
    if (v === null || v === undefined || String(v).trim() === "") {
      fields[f] = null;
    } else {
      fields[f] = String(v).trim();
      filled += 1;
    }
  }
  if (filled < 3) return { fields: null, error: "too few fields readable" };
  return { fields, error: null };
}
