import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubContact } from "@/components/clubs/club-contact";
import { ClubMembershipAdmin } from "@/components/clubs/club-membership-admin";
import { currentPlayerId } from "@/lib/auth/authorization";
import { ManagedMemberList } from "@/components/clubs/managed-member-list";
import { MemberList } from "@/components/clubs/member-list";
import { MemberRow } from "@/components/clubs/member-row";
import {
  CLUB_ADMIN_ROLES,
  ROLE_LABEL,
  getClubDirectory,
  getClubHome,
  getStaffRoster,
  getViewerRole,
  isClubAdmin,
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

  const admin = isClubAdmin(role);
  const [roster, viewerPlayerId] = admin
    ? await Promise.all([getStaffRoster(club.id), currentPlayerId()])
    : [null, null];
  // Staff manage from the roster, which includes private members.
  const active = (roster ?? []).filter((m) => m.status === "active");
  const managedStaff = active.filter((m) => CLUB_ADMIN_ROLES.includes(m.role));
  const managedMembers = active.filter(
    (m) => !CLUB_ADMIN_ROLES.includes(m.role),
  );

  return (
    <div className="club-members">
      {admin && roster && club.joinPolicy ? (
        <ClubMembershipAdmin
          clubId={club.id}
          clubSlug={club.slug}
          roster={roster}
          joinPolicy={club.joinPolicy}
          canSetPolicy={role === "owner" || role === "organizer"}
        />
      ) : null}
      <section className="ph-panel" aria-labelledby="club-staff-heading">
        <ClubContact
          heading={{
            id: "club-staff-heading",
            text: "Club staff",
            hint: `The people who run ${club.name}. Reach them here:`,
          }}
          clubId={club.id}
          clubSlug={club.slug}
          contacts={club.contacts}
          legacyContact={club.contact_info}
          canEdit={admin}
        />
        {admin && role && roster ? (
          <ManagedMemberList
            clubId={club.id}
            clubSlug={club.slug}
            members={managedStaff}
            viewerRole={role}
            viewerPlayerId={viewerPlayerId}
            detail="role"
          />
        ) : staff.length ? (
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
            Members{" "}
            <span className="count-badge">
              {/* Everyone in the club, Club staff included. */}
              {roster ? active.length : directory.length}
            </span>
          </h2>
        </header>
        {admin && role && roster ? (
          <ManagedMemberList
            clubId={club.id}
            clubSlug={club.slug}
            members={managedMembers}
            viewerRole={role}
            viewerPlayerId={viewerPlayerId}
            detail="joined"
          />
        ) : (
          <MemberList
            members={publicMembers}
            privateCount={others.length - publicMembers.length}
          />
        )}
      </section>
    </div>
  );
}
