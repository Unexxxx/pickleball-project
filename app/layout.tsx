import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pickleball Record", template: "%s · Pickleball Record" },
  description: "Trusted club competition records and all-time leaderboards.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#176b42" },
    { media: "(prefers-color-scheme: dark)", color: "#0b3320" },
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
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="app-frame">
          <SiteHeader isAuthenticated={isAuthenticated} />
          <div className="app-content" id="main-content">
            {children}
          </div>
          <MobileNav isAuthenticated={isAuthenticated} />
        </div>
      </body>
    </html>
  );
}
