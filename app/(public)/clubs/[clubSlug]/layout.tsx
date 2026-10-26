import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag } from "lucide-react";
import { ClubProfileHero } from "@/components/clubs/club-profile-hero";
import { ClubTabs } from "@/components/clubs/club-tabs";
import {
  ROLE_LABEL,
  getClubDirectory,
  getClubHome,
  getViewerRole,
} from "@/lib/queries/club-home";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) return { title: "Club not found", robots: { index: false } };
  const description = `${club.name} on UNEX: upcoming pickleball open play, members and the club leaderboard.`;
  return {
    title: `${club.name} — Pickleball Club`,
    description,
    alternates: { canonical: `/clubs/${clubSlug}` },
    openGraph: { title: `${club.name} on UNEX`, description },
  };
}

// The one club home: public for everyone (signed in or not), with management
// tools added for the club's owners, organizers and staff. Each tab is its
// own route so links can point straight at Schedule, Members or Rankings.
export default async function ClubLayout({
  children,
  params,
}: Props & { children: ReactNode }) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const [role, directory] = await Promise.all([
    getViewerRole(club.id),
    getClubDirectory(club.id),
  ]);

  return (
    <main className="ph club-home">
      <ClubProfileHero
        name={club.name}
        timezone={club.timezone}
        memberCount={directory?.length ?? null}
        profileImageUrl={club.profileImageUrl}
        backgroundImageUrl={club.backgroundImageUrl}
        roleLabel={role ? ROLE_LABEL[role] : null}
        media={
          role === "owner" || role === "organizer"
            ? { clubId: club.id, clubSlug: club.slug }
            : undefined
        }
      />
      <ClubTabs slug={club.slug} />
      <div className="club-home__body">{children}</div>
      <footer className="club-footer">
        <Flag aria-hidden="true" size={15} />
        Something wrong at this club?{" "}
        <Link href={`/dashboard/clubs/${club.slug}/reports`}>
          Report a concern
        </Link>
      </footer>
    </main>
  );
}
