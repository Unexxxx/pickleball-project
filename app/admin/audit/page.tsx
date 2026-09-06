import { notFound } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/authorization";
export default async function Page() {
  if (!(await isPlatformAdmin())) notFound();
  return (
    <main>
      <h1>Platform audit</h1>
      <p>
        Immutable moderation actions are retained in the protected audit ledger.
      </p>
    </main>
  );
}
