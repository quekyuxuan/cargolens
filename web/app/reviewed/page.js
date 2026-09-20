import results from "../../data/results.json";
import ReviewedClient from "./reviewed-client";
import { slimList } from "../../lib/slim";

export default function ReviewedPage() {
  return <ReviewedClient rows={slimList(results)} />;
}
