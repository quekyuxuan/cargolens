# CargoLens — handoff (20 Sep 2026)

Repo: `C:\Users\yu xuan\cargolens`. Live: https://cargolens-peach.vercel.app/

## Product

Classify inbox mail, compare SI vs draft BL (7 fields), escalate when unsure.

Official data (never commit `ground_truth.json`):

- `C:\Users\yu xuan\Downloads\sdoc-hackathon-bundle`
- Docker scorer: `http://localhost:8080`

## Done

- Engine score **1.0** with `python run.py --submit` (**no** `--vision`).
- Gemini vision opt-in: `run.py --vision` and Review → upload SI/BL → Retry.
- Clerk write-back: mail page edits + overlay in localStorage (Vercel disk is read-only).
- Outlook: `/outlook` Graph PKCE + manual file drop → live cases in Inbox/Review.
- GitHub `quekyuxuan/cargolens`.

## Run

```powershell
cd "C:\Users\yu xuan\cargolens\web"
npm run dev

cd "C:\Users\yu xuan\cargolens\engine"
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py --submit
```

Vision locally: same command plus `--vision` or `--only email_511 --vision`.

Vercel: set `GEMINI_API_KEY` for live Retry. Azure SPA client id is typed in `/outlook`, not committed.

## Next

Slides + ≤5 min video. Form before **22 Sep 2026 12:00 p.m.**

## Rules

- LLM never sets `has_defect`. Code compares.
- Do not OCR official gold unreadable cases on submit.
