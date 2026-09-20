import board from "../../data/scoreboard.json";

function pct(n) {
  return Math.round((n || 0) * 1000) / 10 + "%";
}

export default function BenchmarkPage() {
  return (
    <main>
      <p className="kicker">Official self-evaluation</p>
      <h1>Benchmark</h1>
      <p className="lede">
        Scored against the private reference set through the organizer Docker endpoint. The engine
        does not load the answer key. Classification is rule-first; comparison is deterministic
        code. Gemini is reserved for later explanation, not for deciding mismatches.
      </p>
      <div className="stats">
        <div className="stat">
          <b>{pct(board.final_score)}</b>
          <span>Final score</span>
        </div>
        <div className="stat">
          <b>{pct(board.stage1.macro_f1)}</b>
          <span>Classification F1</span>
        </div>
        <div className="stat">
          <b>
            {board.end_to_end.success}/{board.end_to_end.total}
          </b>
          <span>Defects caught exactly</span>
        </div>
        <div className="stat">
          <b>{pct(board.reliability.escalation_f1)}</b>
          <span>Review reliability</span>
        </div>
      </div>
      <table className="grid">
        <thead>
          <tr>
            <th>Axis</th>
            <th>Result</th>
            <th>What it measures</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Stage 1 accuracy</td>
            <td>{pct(board.stage1.accuracy)}</td>
            <td>Five-way inbox classification on {board.n_emails} emails</td>
          </tr>
          <tr>
            <td>Defect precision / recall</td>
            <td>
              {pct(board.stage3.defect_precision)} / {pct(board.stage3.defect_recall)}
            </td>
            <td>Comparable SI/BL pairs only; no false alarms in this run</td>
          </tr>
          <tr>
            <td>Field-level F1</td>
            <td>{pct(board.stage3.field_f1)}</td>
            <td>The exact seven shipment fields</td>
          </tr>
          <tr>
            <td>Escalations</td>
            <td>
              {board.reliability.pred_review} predicted / {board.reliability.gold_review} gold
            </td>
            <td>wrong_doc_type, missing attachment, unreadable, missing value</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
