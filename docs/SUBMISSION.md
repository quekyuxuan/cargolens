# Submission checklist

Form: https://forms.gle/nnam5eXrf5cjXdf3
Window: 18–22 September 2026, closes **22 Sep 12:00 p.m.**

## Answers to paste

**Project Name**

```
CargoLens
```

**Project Description / Summary**

```
CargoLens turns a shared shipping-documentation mailbox into a discrepancy report.

A forwarder's documentation team receives a mix of requests, and only some of them ask to verify a
draft bill of lading against the shipping instruction the customer sent. For those, a clerk manually
compares seven fields - shipper, consignee, notify party, port of loading, port of discharge,
container count and gross weight. A wrong consignee or discharge port is usually discovered at the
destination instead of in the mailbox, and the correction costs an amendment fee and a delayed cargo
release.

CargoLens classifies every incoming email, extracts those seven fields from text, PDF, Excel and Word
attachments, and compares them in deterministic code, producing one of three outcomes: Comparison OK,
MISMATCH with the offending fields named, or Pending with the reason it could not decide - wrong
document type, missing attachment, unreadable file, or a blank required value.

AI is used where rules genuinely cannot help: scan-only documents with no text layer are read by
Gemini 3.6 Flash. The model only reads fields; the mismatch verdict always comes from the comparison
code, and a clerk confirms before anything is filed. On the provided 520-email dataset the engine
scores 1.0 against the organizer's evaluation endpoint, with Gemini deliberately switched off so the
five intentionally unreadable cases still escalate to a human.

The clerk interface is a Next.js app deployed on Vercel. Judges can upload an official email JSON
and optional SI/BL files on the Demo page to see the same classify-then-compare path.
```

**GitHub Repository Link**

```
https://github.com/quekyuxuan/cargolens
```

**Live Prototype / Demo Link**

```
https://cargolens-peach.vercel.app/
```

**Slide Deck / Documentation Link**

```
https://github.com/quekyuxuan/cargolens/blob/master/docs/SLIDES.md
```

Covers all four required sections: technical architecture, implementation details, challenges faced,
future roadmap.

**Video Demo Link**

```
<paste the unlisted YouTube or Drive link>
```

## Before you submit

- [ ] Team name and representative details — **see the eligibility note below**
- [ ] Video recorded, under 5:00, uploaded unlisted or link-viewable
- [ ] Open the live link in a private window to confirm judges can reach it
- [ ] Confirm `ground_truth.json` and the organizer attachments are absent from the repo
- [ ] Optional: add `GEMINI_API_KEY` in Vercel so judges can try the clerk retry online

## Eligibility note — check this first

The rules state **"Teams of 2 to 5 members only."** If you are registered as a single member, contact
Ming Dong (+60 12-368 8837), listed in the rules as the approval contact for team composition, before
the deadline. Everything else here is ready; this is the one item that code cannot fix.
