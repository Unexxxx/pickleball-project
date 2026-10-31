import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search" };

/** Explicit, query-based lookup. Browsing lives in Events › Discover. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireUser();
  const input = (await searchParams).q;
  const q = (typeof input === "string" ? input : "").trim().slice(0, 80);
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const supabase = await createClient();
  const results =
    q.length >= 2
      ? await Promise.all([
          supabase
            .from("public_player_profiles")
            .select("player_id,display_name,public_slug")
            .ilike("display_name", pattern)
            .order("display_name")
            .limit(12),
          supabase
            .from("clubs")
            .select("id,name,slug")
            .ilike("name", pattern)
            .order("name")
            .limit(12),
          supabase
            .from("events")
            .select("id,name,join_code,status")
            .in("status", ["published", "registration_closed", "in_progress"])
            .ilike("name", pattern)
            .order("starts_at")
            .limit(12),
        ])
      : null;

  return (
    <main className="ph">
      <header className="ph-page-head">
        <h1 id="search-heading">Search</h1>
      </header>
      <form
        action="/dashboard/search"
        method="get"
        className="hub-search"
        role="search"
        aria-labelledby="search-heading"
      >
        <label htmlFor="hub-query">Find people, clubs and events by name</label>
        <div>
          <input
            id="hub-query"
            name="q"
            type="search"
            defaultValue={q}
            minLength={2}
            maxLength={80}
            placeholder="Enter a name…"
            autoFocus={!q}
          />
          <button type="submit">Search</button>
          {q && <Link href="/dashboard/search">Clear</Link>}
        </div>
      </form>
      {q && q.length < 2 && <p>Enter at least two characters to search.</p>}
      {results && (
        <div className="hub-search-results" aria-label="Search results">
          {[
            {
              title: "People",
              error: results[0].error,
              items: (results[0].data ?? [])
                .filter((p) => p.public_slug)
                .map((p) => ({
                  id: p.player_id!,
                  name: p.display_name!,
                  href: `/players/${p.public_slug}`,
                })),
            },
            {
              title: "Clubs",
              error: results[1].error,
              items: (results[1].data ?? []).map((c) => ({
                id: c.id,
                name: c.name,
                href: `/clubs/${c.slug}`,
              })),
            },
            {
              title: "Events",
              error: results[2].error,
              items: (results[2].data ?? []).map((e) => ({
                id: e.id,
                name: e.name,
                href: `/join/${e.join_code}`,
              })),
            },
          ].map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              {group.error ? (
                <p role="alert">Unable to load results. Try again.</p>
              ) : group.items.length ? (
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href}>{item.name}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No matching {group.title.toLowerCase()}.</p>
              )}
              {group.items.length === 12 && (
                <p>
                  Showing the first 12 results. Refine your search for more
                  specific results.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
