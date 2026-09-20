export default function IncomingPage() {
  return (
    <main>
      <p className="kicker">Live mail, not only the sample pack</p>
      <h1>When a new email arrives</h1>
      <p className="lede">
        The official ZIP is only the evaluation set. The product path is the same for any later
        message: ingest → classify → extract → compare → report or review. How the bytes arrive
        changes; the engine does not.
      </p>
      <table className="grid">
        <thead>
          <tr>
            <th>Source</th>
            <th>What happens</th>
            <th>Now</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Hackathon bundle / Docker</td>
            <td>
              <code>python run.py</code> reads 520 JSON records and writes <code>results.json</code>
            </td>
            <td>Working — used for the 1.0 score</td>
          </tr>
          <tr>
            <td>Operations inbox (Outlook / Graph)</td>
            <td>A connector posts each new mail + attachments into the same pipeline</td>
            <td>Architecture next; not wired this weekend unless we add a Graph app</td>
          </tr>
          <tr>
            <td>Manual drop</td>
            <td>Clerk uploads .eml / PDF / DOCX; worker runs one job</td>
            <td>Same engine, one-email CLI can be added in an hour</td>
          </tr>
        </tbody>
      </table>
      <p className="lede">
        New mail does not require a new model. Add an adapter in front of <code>process_email()</code>.
        Classification rules and the seven-field comparer stay put. Unseen layouts go to review
        instead of a silent wrong answer.
      </p>
    </main>
  );
}
