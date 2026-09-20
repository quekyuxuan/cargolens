# CargoLens — handoff (20 Sep 2026, midday)

Read this at the start of a new chat. Repo: `C:\Users\yu xuan\cargolens`.

## Product

Averis × Monash Hackathon. Classify inbox mail, compare SI vs draft BL (7 fields), escalate when unsure.

Official data (never commit `ground_truth.json`):

- `C:\Users\yu xuan\Downloads\sdoc-hackathon-bundle`
- Docker scorer: `C:\Users\yu xuan\Downloads\sdoc-hackathon-docker` → `http://localhost:8080`

## Done

- Engine `engine/`: rules classify, txt/pdf/docx/xlsx extract, code compare, 4 review reasons.
- Score: **final_score 1.0**.
- UI `web/`: inbox dropdowns, compare, per-reason review, `/incoming`, `/benchmark`.
- Gemini key in `engine/.env` (gitignored). Not used to decide mismatches.
- Vercel config: `web/vercel.json`. **Not deployed yet.**

## Run

```powershell
cd "C:\Users\yu xuan\cargolens\web"
npm run dev
# http://localhost:3000

cd "C:\Users\yu xuan\cargolens\engine"
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py --data http://localhost:8080 --submit
```

Demo: `/mail/email_001`, `/mail/email_004`, `/review/email_501`.

## Next (in order)

1. **Now:** GitHub + Vercel deploy (`web/` as root). Cloud requirement for judges.
2. Optional Gemini: explain a mismatch or vision on scans — never set `has_defect`.
3. Clerk review write-back + real retry (Mon if time).
4. Slides + 5-min video. Submit before **22 Sep 2026 12:00 p.m.**

## Rules

- Code decides match/mismatch. Port = city name, not code alone.
- `???` / TBA = review, not defect.
- APRIL vs APRIL MIDDLE EAST = different shippers.
