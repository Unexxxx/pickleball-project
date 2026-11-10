"use client";

import { MemberRow } from "@/components/clubs/member-row";
import {
  MemberPagerFooter,
  MemberSearch,
  useMemberPages,
} from "@/components/clubs/member-pages";
import { loadMemberPage } from "@/lib/actions/clubs";
import type { DirectoryEntry, MemberPage } from "@/lib/queries/club-home";

const joined = (iso: string) =>
  `Joined ${new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

/**
 * The public member list: 30 at a time with Show more, and a search that
 * covers the whole club. Private profiles are counted, not named.
 */
export function MemberList({
  clubId,
  initial,
  privateCount,
}: {
  clubId: string;
  initial: MemberPage<DirectoryEntry>;
  privateCount: number;
}) {
  const pages = useMemberPages({
    initial,
    load: (query, after) =>
      loadMemberPage({ clubId, scope: "members", query, after }),
    // Public rows always have a name and id; private ones aren't listed.
    cursorOf: (m) => ({ name: m.name ?? "", id: m.playerId ?? "" }),
  });

  return (
    <>
      {initial.total > 6 ? (
        <MemberSearch value={pages.query} onChange={pages.setQuery} />
      ) : null}
      {pages.items.length ? (
        <ul className="ph-list member-grid" aria-busy={pages.loading}>
          {pages.items.map((member) => (
            <li key={member.playerId}>
              <MemberRow member={member} detail={joined(member.joinedAt)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ph-empty">
          {pages.searched
            ? `No members match “${pages.searched}”.`
            : "No members yet."}
        </p>
      )}
      <MemberPagerFooter
        shown={pages.items.length}
        total={pages.total}
        hasMore={pages.hasMore}
        loading={pages.loading}
        error={pages.error}
        onMore={pages.showMore}
      />
      {privateCount > 0 && !pages.searched ? (
        <p className="ph-panel__hint">
          + {privateCount}{" "}
          {privateCount === 1 ? "member keeps" : "members keep"} their profile
          private.
        </p>
      ) : null}
    </>
  );
}
