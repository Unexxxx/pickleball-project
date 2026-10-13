"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Trophy } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  // The landing page is dark end-to-end (see design-system/dink-palette.md),
  // so the header can go fully transparent there instead of showing its
  // usual solid white bar — matching actl.me. Every other route keeps the
  // dark navy bar like the rest of the app (design-system/dink-palette.md).
  const isLandingPage = usePathname() === "/";

  return (
    <header
      className={
        isLandingPage ? "site-header site-header--transparent" : "site-header"
      }
    >
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="UNEX home">
          <span className="brand__logo" role="img" aria-label="UNEX" />
        </Link>
        <nav aria-label="Primary" className="desktop-nav">
          <Link href="/leaderboards">
            <Trophy aria-hidden="true" size={17} /> Rankings
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <LayoutDashboard aria-hidden="true" size={17} /> Dashboard
              </Link>
              <form action={signOut} className="nav-form">
                <button type="submit" className="nav-cta">
                  <LogOut aria-hidden="true" size={17} /> Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="nav-cta">
              <LogIn aria-hidden="true" size={17} /> Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
