import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

// One type system for the whole app (design-system/dink-palette.md).
// Variable-weight latin files are bundled in app/fonts (SIL OFL 1.1) so
// builds never depend on downloading from Google Fonts.
const headingFont = localFont({
  src: "./fonts/bricolage-grotesque-latin-wght.woff2",
  weight: "200 800",
  variable: "--font-heading",
  display: "swap",
});
const bodyFont = localFont({
  src: "./fonts/archivo-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s · UNEX" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "UNEX",
    "pickleball",
    "pickleball open play",
    "pickleball matchmaking",
    "pickleball rankings",
    "pickleball club",
    "pickleball leaderboard",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a2952" },
    { media: "(prefers-color-scheme: dark)", color: "#0a2952" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RootDocument>{children}</RootDocument>;
}

async function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="app-frame">
          <SiteHeader isAuthenticated={isAuthenticated} />
          <div className="app-content" id="main-content">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
