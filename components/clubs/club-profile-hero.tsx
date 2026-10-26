import { Clock3, ShieldCheck, Users } from "lucide-react";
import { ClubMediaButton } from "@/components/clubs/club-media-button";

/**
 * Compact club identity. The cover image is a thin band so the page's real
 * content (what's on, who runs it) starts above the fold. Billing status is
 * internal and is not shown.
 */
export function ClubProfileHero({
  name,
  timezone,
  memberCount,
  profileImageUrl,
  backgroundImageUrl,
  roleLabel,
  media,
}: {
  name: string;
  timezone: string;
  /** Null when the member directory couldn't be loaded: show no count. */
  memberCount: number | null;
  profileImageUrl: string | null;
  backgroundImageUrl: string | null;
  /** The viewer's role in this club, when they are a member. */
  roleLabel?: string | null;
  /** Present for owners/organizers: lets them change the photos in place. */
  media?: { clubId: string; clubSlug: string };
}) {
  return (
    <header className="club-profile-hero">
      <div
        className="club-cover"
        style={
          backgroundImageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, transparent, oklch(15% 0.025 255 / .55)), url(${backgroundImageUrl})`,
              }
            : undefined
        }
      >
        {media ? (
          <ClubMediaButton
            {...media}
            kind="background"
            hasImage={Boolean(backgroundImageUrl)}
          />
        ) : null}
      </div>
      <div className="club-profile-body">
        <div className="club-profile-mark-wrap">
          <div
            className="club-profile-mark"
            role="img"
            aria-label={`${name} club profile picture`}
            style={
              profileImageUrl
                ? { backgroundImage: `url(${profileImageUrl})` }
                : undefined
            }
          >
            {!profileImageUrl ? name.charAt(0).toUpperCase() : null}
          </div>
          {media ? (
            <ClubMediaButton
              {...media}
              kind="profile"
              hasImage={Boolean(profileImageUrl)}
            />
          ) : null}
        </div>
        <div className="club-profile-text">
          <h1>{name}</h1>
          <div className="club-meta">
            {memberCount !== null ? (
              <span>
                <Users aria-hidden="true" size={15} />
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            ) : null}
            <span>
              <Clock3 aria-hidden="true" size={15} /> {timezone}
            </span>
            {roleLabel ? (
              <span className="club-role-chip">
                <ShieldCheck aria-hidden="true" size={14} /> You&apos;re{" "}
                {/^[aeiou]/i.test(roleLabel) ? "an" : "a"} {roleLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
