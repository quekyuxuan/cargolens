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
        Every message gets classified. Comparison requests have their shipping instruction and bill
        of lading read and checked field by field, so you only open the ones that need you.
      </p>
      <InboxClient rows={rows} />
    </main>
  );
}
