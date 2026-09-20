"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inbox", icon: "inbox", also: ["/mail"] },
  { href: "/review", label: "Review", icon: "flag" },
  { href: "/reviewed", label: "Reviewed", icon: "check" },
  { href: "/reminders", label: "Reminders", icon: "bell" },
  { href: "/incoming", label: "New mail", icon: "mail" },
  { href: "/outlook", label: "Outlook", icon: "plug" },
  { href: "/benchmark", label: "Benchmark", icon: "chart" },
];

const PATHS = {
  inbox: "M3 5.5h14M3 5.5 4.6 14a1.2 1.2 0 0 0 1.2 1h8.4a1.2 1.2 0 0 0 1.2-1L17 5.5M7.5 9h5",
  flag: "M5 3v14M5 4h8.5l-1.4 3 1.4 3H5",
  check: "M4 10.6 7.8 14.5 16 5.5",
  bell: "M6 8.5a4 4 0 0 1 8 0c0 3 1 4.5 1 4.5H5s1-1.5 1-4.5ZM8.4 16a1.9 1.9 0 0 0 3.2 0",
  mail: "M3.5 5.5h13v9h-13v-9Zm0 .4 6.5 4.8 6.5-4.8",
  plug: "M7.5 3v4m5-4v4M5.5 7.5h9v2.2a4.5 4.5 0 0 1-9 0V7.5ZM10 14.2V17",
  chart: "M4 16.5V9m4 7.5V4.5m4 12v-5m4 5V7",
};

function Icon({ name }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname() || "/";

  function active(item) {
    if (item.href === "/") return pathname === "/" || pathname.startsWith("/mail");
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside>
      <nav className="side-nav">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={active(item) ? "on" : undefined}>
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2.5 11.7 8.3 17.5 10l-5.8 1.7L10 17.5 8.3 11.7 2.5 10l5.8-1.7L10 2.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      CargoLens
    </Link>
  );
}
