import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClub } from "@/lib/queries/clubs";
import { DisputeResolution } from "@/components/matches/dispute-resolution";
export default async function Page({
  params,
}: {
  params: Promise<{ clubSlug: string; eventId: string }>;
}) {
  const { clubSlug, eventId } = await params,
    club = await getClub(clubSlug);
  if (!club) notFound();
  const s = await createClient(),
    { data } = await s
      .from("result_disputes")
      .select("id,reason_code,description,status,match_results!inner(event_id)")
      .eq("club_id", club.id)
      .eq("match_results.event_id", eventId);
  return (
    <main>
      <h1>Score disputes</h1>
      {(data ?? []).map((d) => (
        <article key={d.id}>
          <h2>{d.reason_code}</h2>
          <p>{d.description}</p>
          {d.status === "open" ? (
            <DisputeResolution
              clubId={club.id}
              eventId={eventId}
              disputeId={d.id}
            />
          ) : null}
        </article>
      ))}
    </main>
  );
}
