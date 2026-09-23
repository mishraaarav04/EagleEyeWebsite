import type { Metadata } from "next";
import Masthead from "@/components/Masthead";
import Logo from "@/components/Logo";
import { SITE } from "@/lib/site";
// Fonts are bundled with the site (no Google Fonts request needed)
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/archivo/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s — ${SITE.name}` },
  description: SITE.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Masthead />
        <div className="page">
          <main>{children}</main>
        </div>
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <Logo size={30} />
              <span className="footer-title">{SITE.name}</span>
            </div>
            <p>{SITE.footer}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
