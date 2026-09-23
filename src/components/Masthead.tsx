import Link from "next/link";
import { SITE } from "@/lib/site";
import Logo from "./Logo";
import NavTabs from "./NavTabs";

// USA Today–style header bar: logo disc on the left, bold section links,
// date on the right. Sticks to the top of the screen while scrolling.
export default function Masthead() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <Logo size={44} />
          <span className="brand-name">{SITE.name}</span>
        </Link>
        <NavTabs />
        <span className="topbar-date">{today}</span>
      </div>
    </header>
  );
}
