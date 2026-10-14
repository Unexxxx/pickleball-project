"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  House,
  LogIn,
  Search,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";

// The one primary navigation for signed-in players. Rankings and match
// history live under Profile; browsing lives in Events › Discover and the
// explicit name lookup is Search.
const APP_NAV = [
  { href: "/dashboard", label: "Home", icon: House, exact: true },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/clubs", label: "Clubs", icon: Users },
];

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  // The landing page is dark end-to-end (see design-system/dink-palette.md),
  // so its header is fixed and transparent; every other route keeps it in
  // normal flow.
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const isCurrent = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

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
        {isAuthenticated ? (
          <nav aria-label="Primary" className="desktop-nav app-nav">
            {APP_NAV.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent(href, exact) ? "page" : undefined}
              >
                <Icon aria-hidden="true" size={17} /> {label}
              </Link>
            ))}
            <Link
              className="app-nav__icon"
              href="/dashboard/search"
              aria-label="Search"
              aria-current={isCurrent("/dashboard/search") ? "page" : undefined}
            >
              <Search aria-hidden="true" size={18} />
            </Link>
            <Link
              className="app-nav__icon app-nav__profile"
              href="/dashboard/profile"
              aria-label="Your profile"
            >
              <UserRound aria-hidden="true" size={18} />
            </Link>
          </nav>
        ) : (
          <nav aria-label="Primary" className="desktop-nav">
            <Link href="/leaderboards">
              <Trophy aria-hidden="true" size={17} /> Rankings
            </Link>
            <Link href="/login" className="nav-cta">
              <LogIn aria-hidden="true" size={17} /> Log in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
