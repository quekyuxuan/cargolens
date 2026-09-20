import results from "../../data/results.json";
import ReviewedClient from "./reviewed-client";

export default function ReviewedPage() {
  return <ReviewedClient rows={Array.isArray(results) ? results : []} />;
}
