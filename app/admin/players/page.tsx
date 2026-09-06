import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { DuplicateReview } from "@/components/moderation/duplicate-review";
export default async function Page() {
  if (!(await isPlatformAdmin())) notFound();
  const s = await createClient(),
    { data } = await s
      .from("duplicate_identity_reviews")
      .select("id,candidate_player_a_id,candidate_player_b_id")
      .in("status", ["open", "reviewing"]);
  return (
    <main>
      <h1>Player identity reviews</h1>
      {(data ?? []).map((r) => (
        <DuplicateReview
          key={r.id}
          reviewId={r.id}
          candidates={[r.candidate_player_a_id, r.candidate_player_b_id]}
        />
      ))}
    </main>
  );
}
