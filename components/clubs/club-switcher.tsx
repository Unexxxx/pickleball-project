import Link from "next/link";
import { listMyClubs } from "@/lib/queries/clubs";
export async function ClubSwitcher() {
  const memberships = await listMyClubs();
  const clubs = Array.from(
    new Map(
      memberships.flatMap((membership) => {
        const club = Array.isArray(membership.clubs)
          ? membership.clubs[0]
          : membership.clubs;
        return club ? [[club.id, club] as const] : [];
      }),
    ).values(),
  );
  return (
    <nav aria-label="Your Clubs">
      <ul>
        {clubs.map((club) => (
          <li key={club.id}>
            <Link href={`/dashboard/clubs/${club.slug}`}>{club.name}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
