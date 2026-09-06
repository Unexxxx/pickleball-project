import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params,
    s = await createClient(),
    { data } = await s
      .from("public_match_history")
      .select(
        "match_id,effect_state,calculation_version,score,winner_side,format,record_class,result_status,has_revision_history",
      )
      .eq("match_id", matchId)
      .single();
  if (!data) notFound();
  return (
    <main>
      <h1>Match result</h1>
      <p>
        {data.format} · {data.record_class}
      </p>
      <p>Status: {data.effect_state}</p>
      <pre>{JSON.stringify(data.score)}</pre>
      <p>
        {data.has_revision_history
          ? "Revision or dispute history exists"
          : "Original result"}
      </p>
      <p>Calculation version {data.calculation_version ?? "none"}</p>
    </main>
  );
}
