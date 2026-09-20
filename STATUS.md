# CargoLens — handoff

**Read this file first in a new chat.** Everything below is verified, not planned.

- Repo: `C:\Users\yu xuan\cargolens` · GitHub `quekyuxuan/cargolens` (public)
- Live: https://cargolens-peach.vercel.app/ (Vercel auto-deploys on push to `master`, root dir `web`)
- Everything is committed and pushed to `master`; run `git log -1` for where you are. If the working
  tree is dirty, that is new work, not leftovers.
- Deadline: Google Form https://forms.gle/nnam5eXrf5cjXdf3 closes **22 Sep 2026 12:00 p.m.**

## What this is

Averis × Monash Hackathon 2026. A shipping documentation clerk gets a mixed mailbox. CargoLens
classifies every email, and for the comparison requests it reads the shipping instruction and the
bill of lading and compares seven fields: shipper, consignee, notify party, port of loading, port of
discharge, container count, gross weight. Three outcomes: **Comparison OK**, **MISMATCH** with named
fields, or **Pending** with a reason.

On the official 520-email set: **154 OK, 46 mismatch, 20 pending, 300 other mail** (mutually
exclusive, sums to 520). Official score **1.0**, re-verified today against the running Docker scorer.

## Commands

Always use this interpreter. The msys `python` on PATH has no pip.

```powershell
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" <args>
```

```powershell
cd "C:\Users\yu xuan\cargolens\engine"
# score it (Docker must be up in the organizer's docker folder)
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py --data http://localhost:8080 --submit
# no scorer, just regenerate outputs
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py
# read a scan-only pair with Gemini. NEVER together with --submit
& "C:\Users\yu xuan\AppData\Local\Programs\Python\Python314\python.exe" run.py --only email_512 --vision

cd "C:\Users\yu xuan\cargolens\web"
npm run dev     # http://localhost:3000
npm run build   # 552 pages, run this before any push
```

`run.py` writes `engine/out/`, `web/data/results.json`, and (with `--submit`) `web/data/scoreboard.json`.

## Data locations — never commit these

- Bundle: `C:\Users\yu xuan\Downloads\sdoc-hackathon-bundle`
- Scorer: `C:\Users\yu xuan\Downloads\sdoc-hackathon-docker` → http://localhost:8080
- `ground_truth.json` and the organizer attachments must stay out of the repo. It is public.

## Rules that must not be broken

1. **Code decides match/mismatch.** The model only reads fields. `compare.py` is the only place a
   defect is declared.
2. **Never run `--vision` with `--submit`.** Five emails are deliberately scan-only or corrupted and
   the reference answer for them is human review. OCR-ing them breaks the 1.0.
3. Ports compare by **city name**, not UN/LOCODE alone — two documents shared a code with different
   cities.
4. `???` / TBA is uncertainty → Pending, never MISMATCH.
5. APRIL and APRIL MIDDLE EAST are **different shippers**.
6. Never let an integration failure share an error path with a data problem (see both defects below).

## Three defects found and fixed — do not regress these

**PowerShell wrote UTF-16 files and git read them as binary.** `.gitignore`, `README.md`, and
`engine/requirements.txt` were UTF-16LE with no BOM. Consequences: the **entire `.gitignore` was
inert**, because git matches patterns as bytes and every pattern carried interleaved NULs — so
`engine/.env`, `ground_truth.json`, and `sdoc-hackathon-*/` were *not* protected in a public repo;
the README rendered as spaced-out garbage on GitHub, which is the first thing a judge sees; and
`pip install -r requirements.txt` could not parse the file. Nothing secret had actually been
committed — verified with `git log --all --name-only`, only the two `.env.example` files. All three
are UTF-8 with LF now.

**Write repo files as UTF-8, never with bare `>` or `Out-File` in PowerShell 5.1**, which defaults to
UTF-16LE. `engine/_fix_enc.py` (untracked) converts `engine/*.py` only; it does not cover the repo
root. To check for a regression:

```powershell
Get-ChildItem -Recurse -File -Include *.md,*.py,*.js,*.json,*.css,*.txt |
  Where-Object { $_.FullName -notmatch "node_modules|\.next|__pycache__" } |
  ForEach-Object { $b=[IO.File]::ReadAllBytes($_.FullName); if ($b.Length -gt 1 -and $b[1] -eq 0) { "UTF16: $($_.FullName)" } }
```

`git diff` calls a UTF-16 file `Bin ... bytes` instead of showing line changes. That is the tell.

**DOCX via python-docx silently cost 0.08 of the score.** `python-docx` needs an lxml DLL that
Windows Application Control blocks on this machine. Eight pairs fell to `unreadable` and the real
score was **0.9208** while we believed it was 1.0. `extract_bin.py` now parses `word/document.xml`
from the OOXML zip with `zipfile` + `ElementTree`, and treats `<w:br/>` as a newline so a company
name never glues onto its address (`APRIL FINE PAPER TRADINGON BEHALF OF…` broke name matching).
`python-docx` is out of `requirements.txt`; only `pdfplumber` and `openpyxl` remain.

**Gemini had never actually run.** Every call returned HTTP 404 because `gemini-2.0-flash` is
retired, and the error was swallowed into a generic "unreadable". Both `engine/vision.py` and
`web/app/api/vision/route.js` now use **`gemini-3.6-flash`** (override with `GEMINI_MODEL`) and
report the upstream message. Verified: `email_512` and `email_513` scans are read and compared.

## Architecture

```
bundle / Outlook Graph / clerk upload
        │
        ▼
 Python engine: loader → classify → extract (txt, pdf, xlsx, docx) → normalize → compare
        │                                    │
        │                                    └─ no text layer, opt-in only ─▶ Gemini 3.6 Flash
        ▼                                                                     (reads, never judges)
 results.json ──▶ Next.js 14 App Router on Vercel
                   ├─ /api/vision  server-side Gemini for clerk retries
                   └─ /api/files   serves an original only if the ZIP is on that host
```

### Engine files

| File | Job |
| --- | --- |
| `loader.py` | Bundle from disk or the organizer HTTP endpoint, same interface |
| `classify.py` | Subject-first rules into the five categories |
| `extract_txt.py` | Label-alias extraction of the seven fields; longest alias wins |
| `extract_bin.py` | pdfplumber / openpyxl / stdlib DOCX |
| `normalize.py` | Company-name and port matching rules |
| `compare.py` | The only place a mismatch is decided |
| `pipeline.py` | Orchestration, `attachment_views` for the UI, `try_vision` flag |
| `vision.py` | Opt-in Gemini extraction, refuses when fewer than 3 fields legible |
| `run.py` | CLI: `--data --out --only --submit --vision` |

### Web pages

| Route | Purpose |
| --- | --- |
| `/` | Inbox. Four filter tiles, search, type/status selects, Restore original, 20 rows a page |
| `/mail/[id]` | Body, attachments with extracted text, comparison sheet, clerk editor, Done button |
| `/review` + `/review/[id]` | The 20 Pending cases. Search, "Why it stopped" filter, 10 a page, upload → Analyse → Confirm |
| `/reviewed` | Done archive. Search, 10 a page, Restore to inbox |
| `/reminders` | One row per mismatch sender. Search, 10 a page, mailto reminder, clerk-flagged filter |
| `/incoming` | How any later message enters the same pipeline |
| `/outlook` + `/outlook/callback` | Graph PKCE import, or drop two files without Azure |

Sidebar order is Inbox · Pending Review · Reviewed · Reminders · New mail · Outlook. There is
deliberately **no Benchmark page** — see "Deleted on purpose" below.

### Web libs

`labels.js` (labels, `displayStatus`, `summarize`), `compare.js` (browser-side deterministic
compare), `slim.js` (list-page projection), `overrides.js` (clerk localStorage + export/import +
`clearClerkLocal`), `live-mail.js` (Outlook/upload cases), `graph.js` (PKCE, `explainAzureError`),
`attachment-panel.js`.

## Things that surprise people

- **Clerk decisions live in `localStorage`**, because the Vercel disk is read-only. Keys:
  `cargolens-overrides`, `cargolens-live-mail`. Each visitor's edits persist in their own browser and
  survive a reload; they do not travel to another device or another judge. Inbox has a **Restore
  original** button to get back to 154 / 46 / 20 / 300. So the inbox counts can differ from
  `results.json` on a browser that has edits — that is correct behaviour, not a bug.
  `exportClerkState` / `importClerkState` still exist in `lib/overrides.js` but nothing calls them
  since the handover panel was removed; they are the hook if a shared store is ever added.
  **This is a deliberate decision, not a gap.** A shared server-side store was considered and
  rejected: if every visitor wrote to one table, one judge pressing Done would change what the next
  judge sees. Per-browser storage gives each of them an isolated sandbox. The Inbox count line says
  so in one sentence, and **Restore original** resets to 154 / 46 / 20 / 300.
- **List pages get a slim projection** (`slim.js`). Sending full records made the inbox HTML 1.1 MB;
  it is now 258 KB. Detail pages still receive the full record. `/reviewed` was missing this and
  shipped the whole of `results.json` at 988 KB; it passes `slimList` now and serves 134 KB.
- **All four list pages paginate** through `app/pager.js` (`usePaged` + `<Pager>`): 20 a page on
  Inbox, 10 elsewhere. The page box is typed into and clamps to `[1, pages]`, the control hides
  itself at a single page, and changing a filter resets to page 1.
- **Originals do not open on Vercel** by design: the attachments are the organizer's and the repo is
  public. `/api/files` 404s with a hint and the UI shows extracted text instead. Locally it reads
  `~/Downloads/sdoc-hackathon-bundle`, overridable with `SDOC_DATA`.
- **`web/.env.local` exists locally** with `GEMINI_API_KEY` copied from `engine/.env`. Both gitignored.
- `email_511` and `email_515` are **not valid PDFs** (`No /Root object`). OCR and vision cannot help;
  asking the sender to resend is the correct answer and matches the reference.
- PowerShell prints `git push` progress on stderr, which surfaces as a red `NativeCommandError`. Check
  the last line for `master -> master`; that means it worked.
- The browser screenshot tool crops to ~884 px wide regardless of viewport. Verify layout by measuring
  elements with CDP instead of trusting the image.

## Deleted on purpose — do not "helpfully" put these back

Trimmed on 20 Sep so the judges see a clerk's tool, not a scoreboard:

- **The `/benchmark` page.** The 1.0 belongs in the deck and the video, not in the product. The score
  is still produced and still committed to `web/data/scoreboard.json` by `run.py --submit`; nothing
  renders it. `docs/VIDEO_SCRIPT.md` now shows the scorer terminal for the impact section instead.
- **The topbar block** — "Documentation desk", the "520 emails triaged ·" subtitle, and the "Official
  benchmark 1.00" pill. The header is only the brand now, so `layout.js` needs neither
  `results.json` nor `scoreboard.json`.
- **The Inbox counts sentence.** The four tiles already carry those numbers; the sentence repeated
  them and went stale the moment a clerk edited anything.
- **The "Decisions live on this device" panel on `/reviewed`**, with Export/Import. See the
  `localStorage` note above for what this means for judges.

## Design system (restyled 20 Sep)

Reference style: soft gradient page, translucent grey frame, white rounded cards, pill sidebar.
Class names were kept, so nearly all styling lives in `web/app/globals.css`.

- Font **Plus Jakarta Sans** via `next/font/google`, self-hosted at build time, system stack behind
  it. Do not switch to a runtime font link; an earlier attempt smashed letter spacing on Vercel.
- Accent **lime `#e2fb4f`** with ink `#1e2609`, used only for the active nav item, the primary button,
  and the selected filter tile. Nothing else.
- Text `#15171c` / `#3f444e` / `#8b909a`. Cards `#fff`, lines `#eeeff2` and `#e2e4e9`, even rows
  `#fbfbfe`.
- Status pills: OK `#0e8a5a`, MISMATCH `#cf2e33`, Pending `#b0700a`, each on a 12 % tint.
- Radii 26 / 20 / 14 px, pills 999 px. Shell is `rgba(211,211,217,.5)` with `backdrop-filter`.
- `web/app/nav.js` holds the sidebar, inline SVG icons, active-route logic, and the `Brand` export
  used by the header.
- `web/app/pager.js` is the only pagination. Arrows are 32 px circles, the page box is a `999px`
  pill on `#f4f5fa`, and the range ("1–20 of 520 emails") sits on the left in `--muted`. Reuse it
  rather than writing a second pager.
- `.lede` is capped at `74ch` for reading. Add `.lede.wide` where the sentence should line up with
  the table edge — `/review`, `/reviewed`, `/reminders` all do.

## Submission material — already written and pushed

- `docs/SLIDES.md` — the deck. Covers the four required sections: technical architecture,
  implementation details, challenges faced, future roadmap. The rules accept a GitHub document as the
  slide-deck link.
- `docs/VIDEO_SCRIPT.md` — timed to 4:40 against the 5:00 limit, with the exact pages to click.
- `docs/SUBMISSION.md` — every form answer ready to paste, plus a pre-submit checklist.

## Still open

1. **Record the video.** Script is ready. Record locally so originals open; say on camera that the
   public site shows extracted text because the dataset is the organizer's.
2. **Add `GEMINI_API_KEY` in Vercel** → Settings → Environment Variables → Redeploy, so judges can use
   the clerk retry. Optional; without it the route returns 501 with an explanation.
3. **Register the Azure SPA app** for Outlook. Redirect URI must sit under Authentication →
   **Single-page application**, permission `Mail.Read`. Optional; the page explains the setup itself.
4. **Eligibility — check this first.** The rules say *"Teams of 2 to 5 members only."* If registered
   solo, contact Ming Dong (+60 12-368 8837), the approval contact named in the rules. Code cannot fix
   this one.
5. ~~Optional polish: homepage subtitle and Benchmark wording.~~ Done. The homepage lede no longer
   repeats the counts sentence that `inbox-client.js` already prints, and the Benchmark lede now uses
   the same "rules classify, code compares" phrasing as the README.
