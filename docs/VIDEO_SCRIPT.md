# Demo video script — target 4:40, hard limit 5:00

One mark is deducted per 30 seconds over. Record locally (`npm run dev`) so original attachments
open; mention that the public deployment shows extracted text instead because the dataset is the
organizer's.

Before recording: `cd web && npm run dev`, open `http://localhost:3000`, press **Restore original**
(top right of the filter row) so the counts read 154 / 46 / 20 / 300.

Lists are paginated — 20 per page on Inbox, 10 on Pending Review. Every email the script names sits
on page 1 of its filter, so you never have to page during the take.

---

## 0:00–0:20 · Intro

> "We're _<team name>_, and this is CargoLens. It turns a mixed shipping mailbox into a document
> discrepancy report, and it escalates to a person instead of guessing."

On screen: the Inbox at `http://localhost:3000`.

## 0:20–1:00 · The problem

> "A documentation clerk gets 520 emails like these. Only 220 are actually asking us to check a
> draft bill of lading against a shipping instruction. For each of those, someone reads two
> documents and confirms seven fields by eye — shipper, consignee, notify party, both ports,
> container count, gross weight."
>
> "Get the consignee or the discharge port wrong and nobody finds out in the mailbox. It surfaces at
> destination, as an amendment fee and a delayed cargo release."

On screen: use the **Type** dropdown to show the five categories, then set it back to All types.

## 1:00–1:35 · Architecture and tech stack

> "A Python engine reads the mailbox, classifies with rules, extracts the seven fields from text,
> PDF, Excel and Word, and compares them in deterministic code. A Next.js app on Vercel is the clerk
> interface. Gemini 3.6 Flash is there for one job only: reading documents that have no text layer."
>
> "The rule we designed around is that the model reads, but the model never decides. Every verdict
> comes from the comparison code, so the same pair always gives the same answer."

On screen: the architecture diagram from the deck, or `docs/SLIDES.md` section 3.

## 1:35–2:30 · Live demo, the happy path and a caught defect

Click the **Comparison OK** tile.

> "154 clean pairs. Open one and you get the original email, both attachments, and the seven fields
> side by side."

Open `email_001`, click **Show extracted text** on one attachment, scroll to the comparison table.

Go back, click the **Mismatches** tile, open `email_004`.

> "46 flagged. Here the consignee and the notify party differ, and the other five fields stay green,
> so the clerk knows exactly what to query. Nothing is hidden behind a single pass or fail."

## 2:30–3:30 · Live demo, the part we are proudest of

Click the **Pending review** tile, open `email_501`.

> "20 cases the engine refuses to answer. This one has a commercial invoice where the bill of lading
> should be. We still show what we could read, but we do not pretend it is a comparison — it stays
> Pending until someone attaches the right document."

Open `/review/email_512`.

> "These two are scans — images with no text at all, so the rules see nothing. This is where the AI
> earns its place."

Upload `email_512_SI.pdf` and `email_512_BL.pdf` from the bundle, click **Analyse replacement**.

> "Gemini reads the seven fields off the image. The comparison is still done by code, and it is
> still Pending until I press Confirm. That confirmation is the whole point: the model's reading is
> a suggestion, not a verdict."

Press **Confirm and file report**.

## 3:30–4:05 · Live demo upload and follow-up

Open **Demo**. Upload `email_001.json` plus the SI and BL text files, press **Run**, then **Done**.

> "Judges can drop any official email JSON here — comparison, invoice, spam. The same five-way
> rules classify it. Only comparison requests get the seven-field check, and only scans hit Gemini."

Open **Reminders**.

> "And because mismatches usually come from the same few senders, this page groups them by sender
> with a ready-to-send reminder."

## 4:05–4:40 · Impact and close

On screen: the scorer result — either the terminal right after
`python run.py --data http://localhost:8080 --submit`, or the results section of `docs/SLIDES.md`.
There is no Benchmark page in the app any more; the score belongs in the deck, not in the tool the
clerk uses every day.

> "Scored through the organizer's own Docker endpoint: classification macro-F1 1.0, defect F1 1.0,
> 46 of 46 end-to-end, and escalation F1 1.0 on the twenty cases that must go to review. Final score
> 1.0."
>
> "Gemini is switched off for that score on purpose. Five of those emails are unreadable by design
> and the correct answer is human review — reading them with a model would only make us disagree with
> the graders."
>
> "So: the boring 154 close themselves, the 46 real defects come with named fields, and the 20 hard
> ones reach a person with the reason and the right action already attached. That is CargoLens."

---

## Recording notes

- 1280×720 or higher, browser zoom around 110% so the field table is legible.
- Do the Gemini upload once before recording; the call takes 15–20 seconds and you can cut the wait.
- Upload to YouTube as **unlisted**, or Google Drive shared **Anyone with the link → Viewer**.
  Private links are not accepted.
