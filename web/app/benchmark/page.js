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
        Scored against the organizer's private reference set through their Docker endpoint. The
        engine never loads the answer key. Rules classify and code compares, so this number does not
        move when a model changes.
      </p>
      <div className="note">
        <strong>Gemini is off for this score.</strong> Five emails carry scan-only or corrupted
        files, and the reference answer for them is human review — reading them with a model would
        make the engine disagree with the graders. Vision runs only when a clerk asks for it on a
        live case, it only fills the seven fields, and a person still confirms before anything is
        filed as OK or MISMATCH.
      </div>
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
            <td>Comparable SI/BL pairs only. No false alarms in this run</td>
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
          <tr>
            <td>Attachment formats read by rules</td>
            <td>txt, pdf, xlsx, docx</td>
            <td>
              DOCX is parsed straight from the OOXML zip, so no native library can be blocked and
              silently turn a comparable pair into review
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
