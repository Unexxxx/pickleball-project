"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MemberRow } from "@/components/clubs/member-row";
import type { DirectoryEntry } from "@/lib/queries/club-home";

const joined = (iso: string) =>
  `Joined ${new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

/** Searchable member list. Filtering is instant (no animation): it's typed. */
export function MemberList({
  members,
  privateCount,
}: {
  members: DirectoryEntry[];
  privateCount: number;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? members.filter((m) => m.name?.toLowerCase().includes(q))
      : members;
  }, [members, query]);

  return (
    <>
      {members.length > 6 ? (
        <label className="member-search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search members</span>
          <input
            type="search"
            placeholder="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}
      {shown.length ? (
        <ul className="ph-list member-grid">
          {shown.map((member) => (
            <li key={member.playerId}>
              <MemberRow
                member={member}
                detail={
                  member.role === "score_official"
                    ? `Score official · ${joined(member.joinedAt)}`
                    : joined(member.joinedAt)
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ph-empty">
          {query ? `No members match “${query}”.` : "No members yet."}
        </p>
      )}
      {privateCount > 0 && !query ? (
        <p className="ph-panel__hint">
          + {privateCount}{" "}
          {privateCount === 1 ? "member keeps" : "members keep"} their profile
          private.
        </p>
      ) : null}
    </>
  );
}
