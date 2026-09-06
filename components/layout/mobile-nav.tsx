import Link from "next/link";
import { House, LayoutDashboard, LogIn, LogOut, Trophy } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const publicLinks = [
  { href: "/", label: "Home", icon: House },
  { href: "/leaderboards", label: "Rankings", icon: Trophy },
];

export function MobileNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const links = isAuthenticated
    ? [
        ...publicLinks,
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ]
    : [...publicLinks, { href: "/login", label: "Log in", icon: LogIn }];

  return (
    <nav aria-label="Primary" className="mobile-nav">
      <ul>
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href}>
              <Icon aria-hidden="true" size={20} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
        {isAuthenticated ? (
          <li>
            <form action={signOut}>
              <button type="submit">
                <LogOut aria-hidden="true" size={20} strokeWidth={2} />
                <span>Log out</span>
              </button>
            </form>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
