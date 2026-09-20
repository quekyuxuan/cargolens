#!/usr/bin/env python3
"""Official-compatible inbox loader (stdlib only)."""
import json
import urllib.request
from pathlib import Path


class Inbox:
    def __init__(self, source):
        self.source = source.rstrip("/")
        self.is_http = self.source.startswith("http://") or self.source.startswith("https://")

    def emails(self):
        if self.is_http:
            return self._get_json("/emails")
        inbox_dir = Path(self.source) / "inbox"
        return [
            json.loads(p.read_text(encoding="utf-8"))
            for p in sorted(inbox_dir.glob("email_*.json"))
        ]

    def __iter__(self):
        return iter(self.emails())

    def get(self, email_id):
        if self.is_http:
            return self._get_json("/emails/" + email_id)
        return json.loads(
            (Path(self.source) / "inbox" / (email_id + ".json")).read_text(encoding="utf-8")
        )

    def read_bytes(self, att_path):
        if self.is_http:
            return self._get_bytes("/" + att_path.lstrip("/"))
        return (Path(self.source) / att_path).read_bytes()

    def read_text(self, att_path, encoding="utf-8"):
        return self.read_bytes(att_path).decode(encoding, errors="replace")

    def submit(self, submission):
        if not self.is_http:
            raise RuntimeError("submit() needs an HTTP source; run the docker server")
        data = json.dumps(submission).encode()
        req = urllib.request.Request(
            self.source + "/submit",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())

    def sample_submission(self):
        if self.is_http:
            return self._get_json("/sample_submission")
        return json.loads((Path(self.source) / "sample_submission.json").read_text(encoding="utf-8"))

    def _get_json(self, path):
        with urllib.request.urlopen(self.source + path) as r:
            return json.loads(r.read())

    def _get_bytes(self, path):
        with urllib.request.urlopen(self.source + path) as r:
            return r.read()
