import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";
import { ProfileEditor } from "@/components/profiles/profile-editor";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export default async function ProfilePage() {
  await requireUser();
  const supabase = await createClient();
  const { data: playerId } = await supabase.rpc("current_player_id");
  if (!playerId) return null;
  const [{ data: player }, { data: stats }, { data: ranking }] =
    await Promise.all([
      supabase
        .from("players")
        .select("display_name,public_slug,avatar_path,version")
        .eq("id", playerId)
        .single(),
      supabase
        .from("public_player_statistics")
        .select("rating,wins,losses,win_rate,current_streak,longest_win_streak")
        .eq("player_id", playerId)
        .maybeSingle(),
      supabase
        .from("public_leaderboards")
        .select("rank,rating")
        .eq("scope", "overall")
        .eq("player_id", playerId)
        .maybeSingle(),
    ]);
  if (!player) return null;
  const avatarUrl = player.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(player.avatar_path).data
        .publicUrl
    : null;

  return (
    <main>
      <header className="page-header">
        <div>
          <p className="eyebrow">Player identity</p>
          <h1>Your player profile</h1>
          <p>Keep the identity shown on matches and leaderboards up to date.</p>
        </div>
        <Link
          className="button button-secondary profile-public-link"
          href={`/players/${player.public_slug}`}
        >
          Public profile <ExternalLink aria-hidden="true" size={17} />
        </Link>
      </header>

      <section className="profile-dashboard-grid">
        <article>
          <h2>Edit profile</h2>
          <ProfileEditor
            displayName={player.display_name}
            avatarPath={player.avatar_path}
            avatarUrl={avatarUrl}
            version={player.version}
          />
        </article>
        <aside className="ranking-card">
          <span className="feature-icon">
            <Trophy aria-hidden="true" />
          </span>
          <p className="eyebrow">Overall standing</p>
          <h2>{ranking?.rank ? `Rank #${ranking.rank}` : "Not ranked yet"}</h2>
          <p className="ranking-rating">
            {Number(ranking?.rating ?? stats?.rating ?? 1500).toFixed(0)}{" "}
            <span>rating</span>
          </p>
          <dl className="ranking-stats">
            <div>
              <dt>Wins</dt>
              <dd>{stats?.wins ?? 0}</dd>
            </div>
            <div>
              <dt>Losses</dt>
              <dd>{stats?.losses ?? 0}</dd>
            </div>
            <div>
              <dt>Win rate</dt>
              <dd>{(Number(stats?.win_rate ?? 0) * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Best streak</dt>
              <dd>{stats?.longest_win_streak ?? 0}</dd>
            </div>
          </dl>
          <p className="ranking-note">
            Rankings use confirmed official ranked matches only.
          </p>
        </aside>
      </section>
    </main>
  );
}
