import { createClient } from "@/lib/supabase/server";
import { TrustScoreHistory } from "@/components/profiles/trust-score-history";
export default async function Page() {
  const s = await createClient(),
    { data } = await s.rpc("get_my_trust_score_history");
  return (
    <main>
      <h1>Your Trust Score</h1>
      <p>This private score never affects Elo, rankings, or matchmaking.</p>
      <TrustScoreHistory
        entries={(data ?? []).map((x) => ({
          ...x,
          delta: Number(x.delta),
          current_score: Number(x.current_score),
        }))}
      />
    </main>
  );
}
