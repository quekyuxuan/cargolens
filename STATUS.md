# CargoLens — handoff (20 Sep 2026, afternoon)

Repo: `C:\Users\yu xuan\cargolens` · GitHub `quekyuxuan/cargolens` · Live
https://cargolens-peach.vercel.app/

## Where things stand

Official score is **1.0** and verified today against the running Docker scorer.

Two defects were found and fixed this afternoon:

- DOCX went through `python-docx`, whose lxml DLL is blocked by Windows Application Control on this
  machine. Eight pairs fell to `unreadable` and the score was really **0.9208**. DOCX is now parsed
  from the OOXML zip with `zipfile` + `ElementTree`, keeping `<w:br/>` as a newline so a company name
  never glues onto its address. Back to 1.0. `python-docx` removed from requirements.
- Every Gemini call had been returning 404 because `gemini-2.0-flash` is retired, so vision had never
  actually run. Engine and API route now use `gemini-3.6-flash`, overridable with `GEMINI_MODEL`.
  Verified: `email_512` and `email_513` scans are read and compared.

## Run

```powershell
cd "C:\Users\yu xuan\cargolens\engine"
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py --data http://localhost:8080 --submit

cd "C:\Users\yu xuan\cargolens\web"
npm run dev
```

Use the Python 3.14 interpreter above; the msys `python` has no pip.

Vision on a scan, never with `--submit`: `run.py --only email_512 --vision`.

## Data

- Bundle: `C:\Users\yu xuan\Downloads\sdoc-hackathon-bundle`
- Scorer: `C:\Users\yu xuan\Downloads\sdoc-hackathon-docker` → http://localhost:8080
- Never commit `ground_truth.json` or the attachments. The repo is public.

## Site pages

Inbox (filter tiles, Restore original), Reviewed (Done archive + export/import), Review (per-reason
actions, upload and Analyse, Confirm), Reminders (mismatch senders), New mail, Outlook (Graph PKCE or
file drop), Benchmark.

Clerk decisions live in `localStorage` because the deployed disk is read-only. Reviewed has
export/import so two machines can merge; newest decision per case wins.

## Still open

1. Push and redeploy — local commits are ahead of `origin/master`, so the live site is stale.
2. Add `GEMINI_API_KEY` in Vercel for the online retry.
3. Register the Azure SPA app; redirect URI must be under **Single-page application**, permission
   `Mail.Read`.
4. Slides, video under five minutes, Google Form. Deadline **22 Sep 2026 12:00 p.m.**

## Rules that must not be broken

- Code decides match/mismatch. The model only reads fields.
- Do not run `--vision` with `--submit`: the five gold `unreadable` cases must stay in review.
- Port comparison is by city name, not the UN/LOCODE alone.
- `???` or TBA is uncertainty, not a defect.
- APRIL and APRIL MIDDLE EAST are different shippers.
