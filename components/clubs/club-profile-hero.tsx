import type { ReactNode } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { ClubPhoto } from "@/components/clubs/club-photo";

/**
 * Compact club identity. The cover image is a thin band so the page's real
 * content (what's on, who runs it) starts above the fold. Billing status is
 * internal and is not shown.
 */
export function ClubProfileHero({
  name,
  memberCount,
  profileImageUrl,
  backgroundImageUrl,
  roleLabel,
  media,
  action,
}: {
  name: string;
  /** Null when the member directory couldn't be loaded: show no count. */
  memberCount: number | null;
  profileImageUrl: string | null;
  backgroundImageUrl: string | null;
  /** The viewer's role in this club, when they are a member. */
  roleLabel?: string | null;
  /** Present for owners/organizers: lets them change the photos in place. */
  media?: { clubId: string; clubSlug: string };
  /** Membership action for the viewer (Join / Request to join / pending). */
  action?: ReactNode;
}) {
  return (
    <header className="club-profile-hero">
      <ClubPhoto
        kind="background"
        url={backgroundImageUrl}
        name={name}
        media={media}
      />
      <div className="club-profile-body">
        <ClubPhoto
          kind="profile"
          url={profileImageUrl}
          name={name}
          media={media}
        />
        <div className="club-profile-text">
          <h1>{name}</h1>
          <div className="club-meta">
            {memberCount !== null ? (
              <span>
                <Users aria-hidden="true" size={15} />
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            ) : null}
            {roleLabel ? (
              <span className="club-role-chip">
                <ShieldCheck aria-hidden="true" size={14} /> You&apos;re{" "}
                {/^[aeiou]/i.test(roleLabel) ? "an" : "a"} {roleLabel}
              </span>
            ) : null}
          </div>
        </div>
        {action ? <div className="club-profile-action">{action}</div> : null}
      </div>
    </header>
  );
}
