# CargoLens

Turns a mixed shipping mailbox into an SI vs bill of lading discrepancy report: classify each email, extract seven fields, compare them in code, and escalate to a person when the system should not guess.

**Live demo:** https://cargolens-peach.vercel.app/  
**Slides:** [docs/CargoLens.pptx](docs/CargoLens.pptx)

---

## What you need

| Tool | Version (approx.) |
| --- | --- |
| Git | any recent |
| Python | 3.10+ |
| Node.js | 18+ (includes `npm`) |

Optional:

- Organizer data bundle (emails + attachments) if you want originals and to re-run the engine
- A Gemini API key if you want scan-only PDF retries
- The organizer Docker scorer if you want to submit for a score

---

## 1. Download the project

```powershell
git clone https://github.com/quekyuxuan/cargolens.git
cd cargolens
```

Or download the ZIP from GitHub → **Code → Download ZIP**, then unzip and open that folder.

---

## 2. Try the live site (no install)

Open https://cargolens-peach.vercel.app/

| Page | What to do |
| --- | --- |
| **Inbox** | Browse the 520 processed emails (OK / mismatch / pending / other) |
| **Pending Review** | Cases the engine refused to decide |
| **Reviewed** | Clerk “Done” decisions (stored in your browser) |
| **Reminders** | Mismatch senders grouped for follow-up |
| **Demo** | Upload an official email `.json` and optional SI/BL files, then **Run** |

On Vercel, original attachments from the organizer ZIP are not hosted. Use **Show extracted text**, or run locally (below) to open originals.

---

## 3. Run the clerk UI locally

```powershell
cd web
npm install
npm run dev
```

Open http://localhost:3000

Optional env (copy then edit):

```powershell
copy .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side only — powers **Analyse** / scan retries via `/api/vision` |
| `GEMINI_MODEL` | Optional model id (has fallbacks if unset) |
| `SDOC_DATA` | Path to the organizer bundle folder so `/api/files` can serve originals |

Restart `npm run dev` after changing `.env.local`. Never commit `.env.local`.

---

## 4. Run the Python engine

Processes the email bundle and writes results the site can load.

```powershell
cd engine
pip install -r requirements.txt
```

Point at your data (folder with the emails/attachments, or set `SDOC_DATA` in `engine/.env`):

```powershell
copy .env.example .env
# edit SDOC_DATA=... to your bundle path
```

Then:

```powershell
python run.py
```

Useful variants:

```powershell
python run.py --only email_001 email_004
python run.py --only email_512 --vision
python run.py --data http://localhost:8080 --submit
```

Do **not** use `--vision` together with `--submit`. Vision is for clerk retries on scan-only files; scoring expects those cases to stay Pending.

Outputs:

| File | Role |
| --- | --- |
| `out/submission.json` | Shape expected by `POST /submit` |
| `out/results.json` | Richer rows (extracted text, etc.) |
| `web/data/results.json` | Same payload the Next.js app reads |

---

## 5. How the pipeline works (short)

```
mailbox → classify → extract (txt/pdf/xlsx/docx) → normalise → compare
                         ↓ (no text layer, optional)
                   Gemini reads fields only
                         ↓
              OK · MISMATCH · Pending
```

- **Rules + code** decide OK / MISMATCH / Pending.
- **Gemini** may fill fields from scans; it never decides a mismatch.
- A clerk confirms before a vision-assisted case is filed.

Seven compared fields: shipper, consignee, notify party, port of loading, port of discharge, container count, gross weight.

---

## 6. Deploy your own copy (optional)

1. Push a fork to GitHub.
2. In Vercel: **Add New Project** → import the repo.
3. Set **Root Directory** to `web`, framework Next.js.
4. Optional: add `GEMINI_API_KEY` (and `GEMINI_MODEL`) under Environment Variables.

---

## Data note

The organizer bundle and `ground_truth.json` are **not** in this repo. The engine never loads ground truth. Keep private datasets on your machine only.
