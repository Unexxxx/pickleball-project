"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClub } from "@/lib/actions/clubs";
export function ClubForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <form
      className="grid max-w-md gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await createClub({
          name: f.get("name"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          idempotencyKey: crypto.randomUUID(),
        });
        if (r.ok) {
          setMessage("Club created. Opening workspace…");
          router.push(`/dashboard/clubs/${r.data.slug}`);
          router.refresh();
          return;
        }
        setMessage(r.error.message);
      }}
    >
      <label>
        Name
        <input name="name" required className="block w-full border p-3" />
      </label>
      <button className="bg-emerald-700 p-3 text-white">Create Club</button>
      <p role="status">{message}</p>
    </form>
  );
}
