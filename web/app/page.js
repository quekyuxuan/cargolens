import results from "../data/results.json";
import InboxClient from "./inbox-client";
import { summarize } from "../lib/labels";
import Link from "next/link";

export default function Home() {
  const rows = Array.isArray(results) ? results : [];
  const s = summarize(rows);
  return (
    <main>
      <p className="kicker">Averis × Monash · shipping documents</p>
      <h1>Inbox to discrepancy report</h1>
      <p className="lede">
        Mixed operations mail is classified first. Only document-check requests compare the shipping
        instruction against the draft bill of lading. When the system cannot decide, it escalates
        instead of guessing.
      </p>
      <div className="stats">
        <div className="stat">
          <b>{s.total}</b>
          <span>Emails triaged</span>
        </div>
        <div className="stat">
          <b>{s.compare}</b>
          <span>Document checks</span>
        </div>
        <div className="stat">
          <b>{s.mismatch}</b>
          <span>Mismatches</span>
        </div>
        <div className="stat">
          <b>{s.review}</b>
          <span>Human review</span>
        </div>
      </div>
      <div className="demo-row">
        <Link className="demo-card" href="/mail/email_001">
          <strong>Clean pair · email_001</strong>
          <p>Seven fields agree. Report: no mismatch detected.</p>
        </Link>
        <Link className="demo-card" href="/mail/email_004">
          <strong>Caught defect · email_004</strong>
          <p>Consignee and notify party differ. The other five fields stay green.</p>
        </Link>
        <Link className="demo-card" href="/mail/email_501">
          <strong>Escalate · email_501</strong>
          <p>Second file is a commercial invoice, not a draft BL. Sent to review.</p>
        </Link>
      </div>
      <InboxClient rows={rows} />
    </main>
  );
}
