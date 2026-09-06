import { BadgeCheck, MapPin } from "lucide-react";

export function ClubProfileHero({
  name,
  timezone,
  subscriptionStatus,
  profileImageUrl,
  backgroundImageUrl,
}: {
  name: string;
  timezone: string;
  subscriptionStatus: string;
  profileImageUrl: string | null;
  backgroundImageUrl: string | null;
}) {
  return (
    <header className="club-profile-hero">
      <div
        className="club-cover"
        style={
          backgroundImageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, transparent, rgb(10 42 26 / .55)), url(${backgroundImageUrl})`,
              }
            : undefined
        }
      />
      <div className="club-profile-body">
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
        <div>
          <p className="eyebrow">
            <BadgeCheck aria-hidden="true" size={15} /> Verified club
          </p>
          <h1>{name}</h1>
          <div className="club-meta">
            <span>
              <MapPin aria-hidden="true" size={16} /> {timezone}
            </span>
            <span className="club-status">
              {subscriptionStatus.replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
