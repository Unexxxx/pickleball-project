import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ClubForm } from "@/components/clubs/club-form";
import { currentPlayerId } from "@/lib/auth/authorization";
import { requireUser } from "@/lib/auth/session";
import { getClubsToDiscover, getMyClubs } from "@/lib/queries/player-home";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clubs" };

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  organizer: "Organizer",
  score_official: "Score official",
  staff: "Staff",
  member: "Member",
};

export default async function ClubsPage() {
  await requireUser();
  const supabase = await createClient();
  const playerId = await currentPlayerId();
  const myClubs = playerId ? await getMyClubs(supabase, playerId) : [];
  const discover = await getClubsToDiscover(
    supabase,
    myClubs.map((c) => c.id),
    12,
  );

  return (
    <main className="ph">
      <header className="ph-page-head">
        <h1>Clubs</h1>
      </header>

      <div className="ph-columns">
        <section className="ph-panel" aria-labelledby="my-clubs-heading">
          <header className="ph-panel__head">
            <h2 id="my-clubs-heading">Your clubs</h2>
          </header>
          {myClubs.length ? (
            <ul className="ph-list">
              {myClubs.map((club) => (
                <li key={club.id}>
                  <Link
                    className="ph-row ph-row--club"
                    href={`/dashboard/clubs/${club.slug}`}
                  >
                    <span className="ph-row__avatar" aria-hidden="true">
                      {club.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="ph-row__body">
                      <strong>{club.name}</strong>
                      <span>{ROLE_LABEL[club.role] ?? club.role}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ph-empty">
              You haven&apos;t joined a club yet. Explore one below or create
              your own.
            </p>
          )}
          <details className="ph-create">
            <summary>
              <Plus aria-hidden="true" size={16} /> Create a club
            </summary>
            <ClubForm />
          </details>
        </section>

        <section className="ph-panel" aria-labelledby="discover-clubs-heading">
          <header className="ph-panel__head">
            <h2 id="discover-clubs-heading">Explore clubs</h2>
          </header>
          {discover.length ? (
            <ul className="ph-list">
              {discover.map((club) => (
                <li key={club.id}>
                  <Link
                    className="ph-row ph-row--club"
                    href={`/clubs/${club.slug}`}
                  >
                    <span className="ph-row__avatar" aria-hidden="true">
                      {club.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="ph-row__body">
                      <strong>{club.name}</strong>
                      <span>Public club page</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ph-empty">No other clubs yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
