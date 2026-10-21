import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubContact } from "@/components/clubs/club-contact";
import { MemberList } from "@/components/clubs/member-list";
import { MemberRow } from "@/components/clubs/member-row";
import {
  CLUB_ADMIN_ROLES,
  ROLE_LABEL,
  getClubDirectory,
  getClubHome,
  getViewerRole,
} from "@/lib/queries/club-home";

export const metadata: Metadata = { title: "Members" };

export default async function ClubMembers({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const [role, directory] = await Promise.all([
    getViewerRole(club.id),
    getClubDirectory(club.id),
  ]);
  if (!directory)
    return (
      <p role="alert">
        The member list couldn&apos;t be loaded. Please refresh and try again.
      </p>
    );
  const staff = directory.filter((m) => CLUB_ADMIN_ROLES.includes(m.role));
  const others = directory.filter((m) => !CLUB_ADMIN_ROLES.includes(m.role));
  const publicMembers = others.filter((m) => m.playerId);

  return (
    <div className="club-members">
      <section className="ph-panel" aria-labelledby="club-staff-heading">
        <header className="ph-panel__head">
          <h2 id="club-staff-heading">Club staff</h2>
        </header>
        <p className="ph-panel__hint">
          The people who run {club.name}. Reach them here:
        </p>
        <ClubContact
          clubId={club.id}
          clubSlug={club.slug}
          contact={club.contact_info}
          canEdit={role === "owner" || role === "organizer"}
        />
        {staff.length ? (
          <ul className="ph-list member-grid">
            {staff.map((member, index) => (
              <li key={member.playerId ?? `private-staff-${index}`}>
                <MemberRow member={member} detail={ROLE_LABEL[member.role]} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="ph-empty">No staff listed.</p>
        )}
      </section>

      <section className="ph-panel" aria-labelledby="club-members-heading">
        <header className="ph-panel__head">
          <h2 id="club-members-heading">
            Members <span className="count-badge">{others.length}</span>
          </h2>
        </header>
        <MemberList
          members={publicMembers}
          privateCount={others.length - publicMembers.length}
        />
      </section>
    </div>
  );
}
