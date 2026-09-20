import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "CargoLens",
  description: "From mixed inbox to SI vs draft BL discrepancy report",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="nav">
            <Link href="/" className="brand">
              CargoLens
            </Link>
            <nav className="nav-links">
              <Link href="/">Inbox</Link>
              <Link href="/review">Review</Link>
              <Link href="/incoming">New mail</Link>
              <Link href="/benchmark">Benchmark</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
