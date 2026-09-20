import results from "../../data/results.json";
import ReviewClient from "./review-client";

export default function ReviewPage() {
  const queue = (results || []).filter((r) => r.status === "NEEDS_REVIEW");
  return (
    <main>
      <p className="kicker">Human in the loop</p>
      <h1>Review queue</h1>
      <p className="lede">
        Cases the engine refused to guess: unreadable files, the wrong document type, a missing
        attachment, or a blank required value. Confirm or correct here; the comparison report stays
        attached to the email.
      </p>
      <ReviewClient queue={queue} />
    </main>
  );
}
