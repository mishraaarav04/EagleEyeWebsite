// The Eagle Eye logo.
//
// TO USE YOUR REAL LOGO: put the image in the `public/` folder named
// logo.png (or logo.svg / logo.jpg / logo.webp). The site picks it up
// automatically and shows it in the top bar and footer. A square image
// works best. Until then, a plain yellow circle placeholder is shown.
import fs from "node:fs";
import path from "node:path";

const CANDIDATES = ["logo.svg", "logo.png", "logo.webp", "logo.jpg", "logo.jpeg"];

function findLogo(): string | null {
  const dir = path.join(process.cwd(), "public");
  for (const name of CANDIDATES) {
    if (fs.existsSync(path.join(dir, name))) return `/${name}`;
  }
  return null;
}

export default function Logo({ size = 40 }: { size?: number }) {
  const src = findLogo();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="logo-mark" style={{ objectFit: "contain" }} />;
  }
  // placeholder until a real logo file is added
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="logo-mark">
      <circle cx="24" cy="24" r="24" fill="var(--yellow-accent)" />
    </svg>
  );
}
