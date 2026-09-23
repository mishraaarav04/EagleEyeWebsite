import { SITE } from "@/lib/site";

// Big nameplate shown only on the front page.
export default function FrontMasthead() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const [first, ...rest] = SITE.name.split(" ");
  const last = rest.pop() ?? "";
  return (
    <div className="nameplate">
      <div className="nameplate-title">
        {first} {rest.join(" ")} <span className="nameplate-accent">{last}</span>
      </div>
      <div className="nameplate-meta">
        <span>{today}</span>
        <span className="nameplate-tagline">{SITE.tagline}</span>
        <span>Dorm Edition</span>
      </div>
    </div>
  );
}
