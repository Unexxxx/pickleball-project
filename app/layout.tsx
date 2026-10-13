import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Bricolage_Grotesque } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

// One type system for the whole app (design-system/dink-palette.md).
const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});
const bodyFont = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: { default: "UNEX", template: "%s · UNEX" },
  description: "Trusted club competition records and all-time leaderboards.",
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
