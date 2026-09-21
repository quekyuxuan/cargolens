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
CargoLens turns a mixed shipping mailbox into an SI vs bill of lading discrepancy report.

Forwarder clerks must check seven fields by eye — shipper, consignee, notify party, both ports,
containers, gross weight. Errors often surface only at destination as amendment fees and delayed
release.

CargoLens classifies every email, extracts those fields from text, PDF, Excel and Word, and compares
them in deterministic code: Comparison OK, MISMATCH with named fields, or Pending with a reason.
Gemini Flash reads scan-only files but never decides a mismatch; a clerk confirms first. On the
official 520-email set the engine scores 1.0 with vision off. A Next.js Demo on Vercel lets judges
upload an email JSON and optional attachments.
```

(~115 words; form limit 150)
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
