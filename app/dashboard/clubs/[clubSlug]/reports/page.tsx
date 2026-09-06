import { notFound } from "next/navigation";
import { getClub } from "@/lib/queries/clubs";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/reports/report-form";
import { EvidenceUploader } from "@/components/reports/evidence-uploader";
export default async function Page({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const club = await getClub((await params).clubSlug);
  if (!club) notFound();
  const s = await createClient(),
    { data } = await s
      .from("reports")
      .select("id,status,created_at")
      .eq("subject_id", club.id);
  return (
    <main>
      <h1>Report a concern</h1>
      <ReportForm subjectType="club" subjectId={club.id} />
      <EvidenceUploader />
      <h2>Your reports</h2>
      {(data ?? []).map((r) => (
        <p key={r.id}>
          {r.status} · {new Date(r.created_at).toLocaleDateString()}
        </p>
      ))}
    </main>
  );
}
