"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Current Articles", match: (p: string) => p === "/" },
  { href: "/past", label: "Past Articles", match: (p: string) => p.startsWith("/past") },
  { href: "/games", label: "Games", match: (p: string) => p.startsWith("/games") },
];

export default function NavTabs() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="nav-tabs" aria-label="Sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={t.match(pathname) ? "active" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
