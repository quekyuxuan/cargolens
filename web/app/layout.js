import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import board from "../data/scoreboard.json";
import results from "../data/results.json";
import Nav, { Brand } from "./nav";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata = {
  title: "CargoLens",
  description: "From a mixed inbox to an SI vs bill of lading discrepancy report",
};

export default function RootLayout({ children }) {
  const total = Array.isArray(results) ? results.length : 0;
  const score = Math.round((board.final_score || 0) * 100) / 100;

  return (
    <html lang="en" className={sans.variable}>
      <body>
        <div className="page">
          <div className="shell">
            <header className="topbar">
              <Brand />
              <div>
                <h1>Documentation desk</h1>
                <p>{total} emails triaged · shipping instruction checked against the bill of lading</p>
              </div>
              <div className="score-pill">
                <span>Official benchmark</span>
                <b>{score.toFixed(2)}</b>
              </div>
            </header>
            <div className="layout">
              <Nav />
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
