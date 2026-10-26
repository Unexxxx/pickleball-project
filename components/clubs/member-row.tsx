import Link from "next/link";
import type { DirectoryEntry } from "@/lib/queries/club-home";

/** One club member: avatar, name and a detail line (role or join date). */
export function MemberRow({
  member,
  detail,
}: {
  member: DirectoryEntry;
  detail: string;
}) {
  const body = (
    <>
      <span
        className="ph-row__avatar"
        aria-hidden="true"
        style={
          member.avatarUrl
            ? { backgroundImage: `url(${member.avatarUrl})` }
            : undefined
        }
      >
        {member.avatarUrl ? null : (member.name ?? "?").charAt(0).toUpperCase()}
      </span>
      <span className="ph-row__body">
        <strong>{member.name ?? "Private player"}</strong>
        <span>{detail}</span>
      </span>
    </>
  );
  // Private players have no public profile to link to.
  return member.slug ? (
    <Link className="ph-row ph-row--club" href={`/players/${member.slug}`}>
      {body}
    </Link>
  ) : (
    <div className="ph-row ph-row--club">{body}</div>
  );
}
