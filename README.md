# CargoLens

Inbox → classify → read the shipping instruction and the bill of lading → compare seven fields in
code → send it to a person when the system should not guess.

Built for the Averis × Monash Hackathon 2026 shipping-document use case.

Live demo: https://cargolens-peach.vercel.app/

**Starting a new chat?** Tell the agent to read `STATUS.md` first.

## How it scores

Rules classify, code compares, and the model is never allowed to decide whether a defect exists.
Against the organizer's private reference set the engine reports **1.0**: classification macro-F1
1.0, defect F1 1.0, 46/46 end-to-end, and escalation F1 1.0 on the twenty cases that must go to
review.

Gemini stays **off** during scoring. Five emails are scan-only or corrupted and the reference answer
for them is human review, so reading them with a model would only create disagreement.

## Engine

```powershell
cd engine
pip install -r requirements.txt

python run.py                      # writes out/ and web/data/results.json
python run.py --only email_001 email_004
```

Score it against the organizer container (`docker compose up` in their docker folder):

```powershell
python run.py --data http://localhost:8080 --submit
```

Read a scan-only pair with Gemini — never together with `--submit`:

```powershell
python run.py --only email_512 --vision
```

Outputs:

- `out/submission.json` — the shape `POST /submit` expects
- `out/results.json` — richer rows, including extracted text per attachment
- `web/data/results.json` — the same file the site reads

Only `pdfplumber` and `openpyxl` are required. DOCX is read from the OOXML zip with the standard
library, because `python-docx` needs an lxml DLL that Windows Application Control can block, which
silently turned eight comparable pairs into "unreadable" and cost 0.08 of the score.

## Site

```powershell
cd web
npm install
npm run dev     # http://localhost:3000
```

Copy `web/.env.example` to `web/.env.local` if you want the clerk-facing Gemini retry or original
attachments locally.

| Page | What it is for |
| --- | --- |
| Inbox | All 520 emails. Tiles filter; counts never overlap |
| Reviewed | Comparison-OK mail a clerk marked Done, searchable, restorable to Inbox |
| Pending Review | The twenty Pending cases, filtered by why they stopped |
| Reminders | One row per sender who caused a mismatch, ready to chase |
| Demo | Upload an official email JSON and optional SI/BL; same rules as the 520 |

## Data handling

The organizer bundle and `ground_truth.json` are never committed. The site reads originals from the
local ZIP through `/api/files`; on the public deployment that route returns a 404 and the UI shows
the extracted text instead.

## Deploy

1. Push to GitHub.
2. Vercel → Add New Project → import the repo.
3. **Root Directory** = `web`. Framework = Next.js.
4. Optional: add `GEMINI_API_KEY` under Settings → Environment Variables so the clerk retry works
   online. It is read server-side only and never reaches the browser.
