import Link from "next/link";
import {
  CircleDot,
  LayoutDashboard,
  LogIn,
  LogOut,
  Trophy,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Pickleball Record home">
          <span className="brand__mark" aria-hidden="true">
            <CircleDot size={22} strokeWidth={2.5} />
          </span>
          <span>Pickleball Record</span>
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
