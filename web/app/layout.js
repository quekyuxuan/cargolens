import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
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
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <div className="page">
          <div className="shell">
            <header className="topbar">
              <Brand />
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
