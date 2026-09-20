import results from "../data/results.json";
import InboxClient from "./inbox-client";
import { slimList } from "../lib/slim";

export default function Home() {
  const rows = slimList(results);
  return (
    <main>
      <p className="kicker">Averis × Monash · shipping documents</p>
      <h1>Inbox to discrepancy report</h1>
      <p className="lede">
        Every message is classified. Only comparison requests (SI vs bill of lading) are checked
        field-by-field. The four counts match the filter — they are not overlapping.
      </p>
      <InboxClient rows={rows} />
    </main>
  );
}
