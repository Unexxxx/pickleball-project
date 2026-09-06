export function ProfileHeader({
  name,
  slug,
  avatarUrl,
}: {
  name: string;
  slug: string;
  avatarUrl?: string | null;
}) {
  return (
    <header className="profile-header">
      <div className="flex items-center gap-3">
        <span
          className="profile-avatar"
          role="img"
          aria-label={`${name}'s profile photo`}
          style={
            avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined
          }
        >
          {!avatarUrl ? name[0] : null}
        </span>
        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p>@{slug}</p>
        </div>
      </div>
    </header>
  );
}
