import Link from "next/link";
import { SITE } from "@/lib/site";
import NavTabs from "./NavTabs";

export default function Masthead() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

  return (
    <header className="masthead">
      <div className="masthead-top">
        <span className="masthead-date">{today}</span>
        <span className="masthead-edition">Dorm Edition</span>
      </div>
      <Link href="/" className="masthead-title">
        {SITE.name}
      </Link>
      <p className="masthead-tagline">{SITE.tagline}</p>
      <NavTabs />
    </header>
  );
}
