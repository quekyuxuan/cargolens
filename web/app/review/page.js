import results from "../../data/results.json";
import ReviewClient from "./review-client";
import { slimList } from "../../lib/slim";

export default function ReviewPage() {
  const queue = slimList((results || []).filter((r) => r.status === "NEEDS_REVIEW"));
  return (
    <main>
      <p className="kicker">Human in the loop</p>
      <h1>Review queue</h1>
      <p className="lede">
        Cases that stay Pending: wrong document type, missing file, unreadable scan, or a blank
        required value. The engine may extract a preview, but Comparison OK / MISMATCH only after a
        clerk confirms a valid SI + bill of lading pair.
      </p>
      <ReviewClient queue={queue} />
    </main>
  );
}
