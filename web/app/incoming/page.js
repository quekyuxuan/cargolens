import Link from "next/link";

export default function IncomingPage() {
  return (
    <main>
      <p className="kicker">Live mail, not only the sample pack</p>
      <h1>When a new email arrives</h1>
      <p className="lede">
        Official ZIP scoring stays on the Python engine. Live mail uses the same seven fields, then
        writes a browser overlay so Vercel never needs the attachment disk.
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
            <td>Hackathon bundle</td>
            <td>
              <code>python run.py --submit</code> (no <code>--vision</code>)
            </td>
            <td>Official 1.0 — do not OCR the gold unreadable cases</td>
          </tr>
          <tr>
            <td>Outlook</td>
            <td>
              Microsoft Graph, Mail.Read, PKCE in this browser. Pick a message; attachments become a
              live case.
            </td>
            <td>
              <Link href="/outlook">Connect Outlook →</Link>
            </td>
          </tr>
          <tr>
            <td>Manual drop</td>
            <td>Upload SI + BL on Review, or drop a pair on the Outlook page without signing in</td>
            <td>Works without Azure if you only have files</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
