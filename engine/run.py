#!/usr/bin/env python3
"""Run the pipeline on the official bundle and write submission plus demo results."""
import argparse
import json
import sys
from pathlib import Path

from loader import Inbox
from pipeline import process_email, to_submission_row


def main():
    p = argparse.ArgumentParser()
    p.add_argument(
        "--data",
        default=r"C:\Users\yu xuan\Downloads\sdoc-hackathon-bundle",
        help="Path to official bundle or http://localhost:8080",
    )
    p.add_argument("--out", default="out", help="Output folder")
    p.add_argument("--only", nargs="*", help="Optional email_id list")
    p.add_argument("--submit", action="store_true", help="POST to docker scorer")
    args = p.parse_args()

    inbox = Inbox(args.data)
    emails = inbox.emails()
    if args.only:
        want = set(args.only)
        emails = [e for e in emails if e["email_id"] in want]

    results = []
    submission = {}
    for email in emails:
        rec = process_email(email, inbox)
        results.append(rec)
        submission[rec["email_id"]] = to_submission_row(rec)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(results, indent=2, ensure_ascii=False)
    (out / "results.json").write_text(payload, encoding="utf-8")
    (out / "submission.json").write_text(json.dumps(submission, indent=2), encoding="utf-8")
    web_data = Path(__file__).resolve().parents[1] / "web" / "data"
    web_data.mkdir(parents=True, exist_ok=True)
    (web_data / "results.json").write_text(payload, encoding="utf-8")
    print("wrote %d records to %s" % (len(results), out))

    for eid in ("email_001", "email_004"):
        if eid in submission:
            print(eid, json.dumps(submission[eid]))

    if args.submit:
        scorer = inbox if inbox.is_http else Inbox("http://localhost:8080")
        board = scorer.submit(submission)
        (out / "scoreboard.json").write_text(json.dumps(board, indent=2), encoding="utf-8")
        print("final_score", board.get("final_score"))


if __name__ == "__main__":
    sys.exit(main())
