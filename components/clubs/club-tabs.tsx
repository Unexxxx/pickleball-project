"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The club's own sections. "Schedule" (not "Events") so it can't be confused
// with the header's Events, which is the player's events across all clubs.
// Tabs switch instantly: they're used constantly, so no transition.
export function ClubTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/clubs/${slug}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/schedule`, label: "Schedule" },
    { href: `${base}/members`, label: "Members" },
    { href: `${base}/rankings`, label: "Rankings" },
  ];
  return (
    <nav className="ph-tabs club-tabs" aria-label="Club sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
