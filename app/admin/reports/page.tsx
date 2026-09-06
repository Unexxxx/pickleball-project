import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { ReportQueue } from "@/components/moderation/report-queue";
export default async function Page() {
  if (!(await isPlatformAdmin())) notFound();
  const s = await createClient(),
    { data } = await s
      .from("reports")
      .select("id,description,status,version")
      .order("created_at");
  return (
    <main>
      <h1>Platform reports</h1>
      <ReportQueue reports={data ?? []} />
    </main>
  );
}
