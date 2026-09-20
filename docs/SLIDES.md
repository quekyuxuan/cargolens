# CargoLens — Preliminary Submission Deck

**Team:** _<team name>_ · **Project:** CargoLens
**Live prototype:** https://cargolens-peach.vercel.app/
**Repository:** https://github.com/quekyuxuan/cargolens

---

## 1. The problem

A shipping documentation clerk opens a shared mailbox that mixes five kinds of request. Only some of
them are "check my draft bill of lading against my shipping instruction". For those, a person reads
two documents side by side and confirms seven fields: shipper, consignee, notify party, port of
loading, port of discharge, container count, gross weight.

Why it matters: a wrong consignee or port on a bill of lading is discovered at the destination, not
in the mailbox. The fix then involves the carrier, an amendment fee, and a delayed release. The
clerk is the last checkpoint, and the check is manual, repetitive, and easy to rush.

Who it affects: documentation teams at the forwarder, the shipper who sent the instruction, and the
consignee waiting for cargo release.

Scale in the provided dataset: **520 emails, 250 attachments, 220 genuine comparison requests.**

---

## 2. What CargoLens does

```
mailbox ──▶ classify ──▶ read both documents ──▶ compare 7 fields ──▶ OK / MISMATCH
                │                                      │
                │                                      └─▶ cannot decide ──▶ Pending, with a reason
                └─▶ not a comparison request ──▶ file it, do not compare
```

Three outcomes, never a guess:

| Outcome | Meaning |
| --- | --- |
| Comparison OK | All comparable fields agree |
| MISMATCH | Named fields disagree, shown side by side |
| Pending | Wrong document type, missing attachment, unreadable file, or a blank required value |

On the 520-email set: **154 OK, 46 mismatch, 20 pending, 300 other mail.** The four counts are
mutually exclusive and add up to 520.

---

## 3. Technical architecture

```
                        ┌──────────────────────────────┐
  organizer bundle ────▶│  Python engine               │
  or Outlook/Graph      │  loader → classify → extract │──▶ results.json
  or clerk upload       │  → normalise → compare       │    submission.json
                        └───────────┬──────────────────┘
                                    │ (no text layer, opt-in only)
                                    ▼
                          Gemini 3.6 Flash (vision)
                          reads fields · never judges

  results.json ──▶ Next.js on Vercel ──▶ Inbox · Review · Reminders · Reviewed · Benchmark
                         │
                         ├─ /api/vision  server-side Gemini call for clerk retries
                         └─ /api/files   serves an original only if the ZIP is on that host
```

**Components**

| Module | Responsibility |
| --- | --- |
| `loader.py` | Reads the bundle from disk or the organizer HTTP endpoint; identical interface either way |
| `classify.py` | Subject-first rules into the five categories |
| `extract_txt.py` | Label-alias extraction of the seven fields from document text |
| `extract_bin.py` | PDF via pdfplumber, XLSX via openpyxl, DOCX straight from the OOXML zip |
| `normalize.py` | Company-name and port comparison rules |
| `compare.py` | The only place a mismatch is decided |
| `vision.py` | Opt-in Gemini extraction for files with no text layer |
| `web/` | Next.js clerk interface, deployed on Vercel |

**The load-bearing design decision:** the language model is allowed to *read*, never to *decide*.
`compare.py` is deterministic code, so the same pair always produces the same verdict, and a model
change cannot silently alter an audit trail. Everything a model produced is labelled
`gemini-vision` in the interface and requires a clerk to confirm before it is filed.

---

## 4. Implementation details

**Classification** is rule-first on the subject line, falling back to the body. Order matters: a
request for a *new* shipping instruction often contains the phrase "draft BL", so the SI rule is
evaluated before the comparison rule.

**Field extraction** matches label aliases, longest first, so "Notify Party" wins over "Notify". The
same extractor runs on text from every format, which is why adding XLSX and DOCX cost no new
comparison logic.

**Comparison rules learned from the data**, each one a real failure we hit:

- Ports are compared by **city name**, not UN/LOCODE alone: two documents shared a code but named
  different cities.
- `APRIL` and `APRIL MIDDLE EAST` are **different shippers**, so a leading-name match is not enough.
- Addresses leak into name cells; the comparison strips the trailing address lines.
- A blank marked `???` or `TBA` is **uncertainty, not a defect** — it becomes Pending, never
  MISMATCH.

**Attachment formats in the dataset:** 192 `.txt`, 28 `.pdf`, 22 `.xlsx`, 8 `.docx`. Rules read all
four. Of the 28 PDFs, 23 have a text layer, 3 are scan-only images, and 2 are corrupted bytes.

**Vision path.** Only files with no text layer reach Gemini, and only when a human asks. It returns
the seven fields as JSON at temperature 0, and refuses when fewer than three are legible. The
verdict still comes from `compare.py`.

**Clerk write-back.** A deployed Vercel filesystem is read-only, so clerk decisions live in the
browser and the Reviewed page exports and imports them as a handover file. In production this same
payload is one shared table; the interface does not change.

---

## 5. Validation

Scored through the organizer's Docker endpoint. The engine never loads `ground_truth.json`.

| Axis | Result |
| --- | --- |
| Classification macro-F1 | 1.0 |
| Defect F1 (precision / recall) | 1.0 (1.0 / 1.0) |
| End-to-end exact field match | 46 / 46 |
| Escalation F1 | 1.0 — 20 predicted, 20 expected |
| **Final score** | **1.0** |

**Gemini is off for this score, deliberately.** Five emails carry scan-only or corrupted files and
the reference answer for them is human review. Reading them with a model would make the engine
disagree with the graders, which tells us the escalation behaviour is genuinely being measured.

---

## 6. Challenges faced

**A blocked DLL cost 0.08 of the score, silently.** `python-docx` needs an lxml DLL that Windows
Application Control blocks on the development machine. Eight DOCX pairs fell to "unreadable" and
the real score was 0.9208 while we believed it was 1.0. Fix: parse `word/document.xml` from the
OOXML zip with the standard library, treating `<w:br/>` as a newline so a company name never glues
onto its address. Lesson: a dependency that fails at import looks exactly like a document that
cannot be read, so the two must be distinguishable in the logs.

**The vision feature had never run.** Every Gemini call returned HTTP 404 because
`gemini-2.0-flash` was retired, and the error was being swallowed into a generic "unreadable".
Fix: move to `gemini-3.6-flash` and make both the engine and the API route report the upstream
message. Lesson: never let an integration failure share an error path with a data problem.

**Some documents cannot be rescued by any model.** Two PDFs are not valid PDFs at all — no `/Root`
object. OCR and vision are equally useless. The honest product answer is to ask the sender to
resend, which is exactly what the reference answer expects.

**A read-only deployment target.** Vercel cannot persist clerk decisions or host the organizer's
attachments, and the attachments are not ours to publish. The interface degrades explicitly: it
shows the extracted text and says why the original is unavailable.

**Payload weight.** Embedding every body and every extracted text sent 1.1 MB to the browser on the
inbox. A slim projection for list pages brought it to 258 KB without touching the detail pages.

---

## 7. Future roadmap

**Next (days).** Replace the browser handover file with one Postgres table so decisions are shared
and audited. Finish the Outlook connector into a background worker so mail is ingested on arrival
rather than on a button press.

**Then (weeks).** Learn from clerk corrections: every confirmed edit is a labelled example of how a
company name or port is really written, which tightens the normalisation rules without retraining
anything. Add the remaining document types already in the mailbox — commercial invoice and packing
list — as first-class comparisons rather than reasons to escalate.

**Later.** Push the check upstream. The same comparison can run when the shipping instruction is
submitted, so the mismatch is caught before a draft bill of lading is ever issued. Expose it as an
API the carrier's own portal can call.

**Why it is adoptable:** it slots into an existing mailbox, needs no change from customers, and
never files a verdict a clerk has not seen. The failure mode is "ask a human", which is the same
thing the team already does.
