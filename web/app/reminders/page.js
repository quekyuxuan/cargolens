import results from "../../data/results.json";
import RemindersClient from "./reminders-client";
import { slimList } from "../../lib/slim";

export default function RemindersPage() {
  // Seed every email, not only engine mismatches: a clerk can turn any case into MISMATCH.
  return <RemindersClient seed={slimList(results)} />;
}
