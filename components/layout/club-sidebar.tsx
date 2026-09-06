import Link from "next/link";
import { CalendarDays, Flag, LayoutGrid, Users } from "lucide-react";
export function ClubSidebar({ clubSlug }: { clubSlug: string }) {
  const links = [
    {
      href: `/dashboard/clubs/${clubSlug}`,
      label: "Overview",
      icon: LayoutGrid,
    },
    {
      href: `/dashboard/clubs/${clubSlug}/events`,
      label: "Events",
      icon: CalendarDays,
    },
    {
      href: `/dashboard/clubs/${clubSlug}/members`,
      label: "Members",
      icon: Users,
    },
    {
      href: `/dashboard/clubs/${clubSlug}/reports`,
      label: "Reports",
      icon: Flag,
    },
  ];
  return (
    <aside className="club-sidebar">
      <nav aria-label="Club management">
        <p>Club workspace</p>
        <ul>
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href}>
                <Icon aria-hidden="true" size={18} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
