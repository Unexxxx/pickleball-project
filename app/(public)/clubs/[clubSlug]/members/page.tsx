import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubContact } from "@/components/clubs/club-contact";
import { ClubMembershipAdmin } from "@/components/clubs/club-membership-admin";
import { currentPlayerId } from "@/lib/auth/authorization";
import {
  ManagedMemberList,
  PagedManagedMemberList,
} from "@/components/clubs/managed-member-list";
import { MemberList } from "@/components/clubs/member-list";
import { MemberRow } from "@/components/clubs/member-row";
import {
  ROLE_LABEL,
  getClubHome,
  getClubMemberCounts,
  getMemberPage,
  getRosterPage,
  getViewerRole,
  isClubAdmin,
} from "@/lib/queries/club-home";

export const metadata: Metadata = { title: "Members" };

/**
 * Club staff, then Members. Lists load 30 at a time and search the whole
 * club in the database, so this works the same for 5 members or 5,000.
 * Owners and admins also get join requests and a menu on each member.
 */
export default async function ClubMembers({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  if (!club) notFound();
  const role = await getViewerRole(club.id);
  const admin = isClubAdmin(role);

  const [counts, staff, members, roster] = await Promise.all([
    getClubMemberCounts(club.id),
    getMemberPage(club.id, "staff"),
    getMemberPage(club.id, "members"),
    admin
      ? Promise.all([
          getRosterPage(club.id, "staff"),
          getRosterPage(club.id, "members"),
          getRosterPage(club.id, "requests"),
          currentPlayerId(),
        ])
      : null,
  ]);
  if (!counts || !staff || !members)
    return (
      <p role="alert">
        The member list couldn&apos;t be loaded. Please refresh and try again.
      </p>
    );
  // Owners and admins manage from the roster, which includes private
  // members. If it can't be read, they see the public lists.
  const [rosterStaff, rosterMembers, requests, viewerPlayerId] = roster ?? [];
  const manage =
    admin && role && rosterStaff && rosterMembers && requests ? role : null;

  return (
    <div className="club-members">
      {manage && requests && club.joinPolicy ? (
        <ClubMembershipAdmin
          clubId={club.id}
          clubSlug={club.slug}
          requests={requests}
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
        {manage && rosterStaff ? (
          <ManagedMemberList
            clubId={club.id}
            clubSlug={club.slug}
            members={rosterStaff.items}
            viewerRole={manage}
            viewerPlayerId={viewerPlayerId ?? null}
            detail="role"
            emptyText="No staff listed."
          />
        ) : staff.items.length ? (
          <ul className="ph-list member-grid">
            {staff.items.map((member, index) => (
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
              {counts.members.toLocaleString("en-US")}
            </span>
          </h2>
        </header>
        {manage && rosterMembers ? (
          <PagedManagedMemberList
            clubId={club.id}
            clubSlug={club.slug}
            initial={rosterMembers}
            viewerRole={manage}
            viewerPlayerId={viewerPlayerId ?? null}
            detail="joined"
          />
        ) : (
          <MemberList
            clubId={club.id}
            initial={members}
            privateCount={counts.privateMembers}
          />
        )}
      </section>
    </div>
  );
}
