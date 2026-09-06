import Link from "next/link";
import { CalendarDays, Plus, Trophy, UserRound } from "lucide-react";
import { ClubForm } from "@/components/clubs/club-form";
import { ClubSwitcher } from "@/components/clubs/club-switcher";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
export default async function Dashboard() {
  await requireUser();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select(
      "id,club_id,name,venue,starts_at,status,record_class,join_code,is_private,clubs(name,slug)",
    )
    .eq("status", "published")
    .eq("is_private", false)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(24);

  return (
    <main>
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Player hub</p>
          <h1>Your next game starts here.</h1>
          <p>
            Find public events from every club, manage your player record, and
            follow the competition.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link className="button" href="/leaderboards">
            <Trophy aria-hidden="true" size={18} /> Rankings
          </Link>
          <Link className="button button-secondary" href="/dashboard/profile">
            <UserRound aria-hidden="true" size={18} /> My profile
          </Link>
        </div>
      </header>

      <section aria-labelledby="events-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Open to all players</p>
            <h2 id="events-heading">Upcoming public events</h2>
          </div>
        </div>
        {events?.length ? (
          <div className="event-grid">
            {events.map((event) => {
              const club = Array.isArray(event.clubs)
                ? event.clubs[0]
                : event.clubs;
              const start = new Date(event.starts_at);
              return club ? (
                <article className="event-card" key={event.id}>
                  <div className="event-card__date">
                    <span>
                      {start.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <strong>{start.getDate()}</strong>
                  </div>
                  <div className="event-card__content">
                    <div className="event-card__badges">
                      <span>{club.name}</span>
                      <span>{event.record_class}</span>
                    </div>
                    <h2>
                      <Link href={`/join/${event.join_code}`}>
                        {event.name}
                      </Link>
                    </h2>
                    <p>{event.venue}</p>
                    <p>
                      {start.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </article>
              ) : null;
            })}
          </div>
        ) : (
          <div className="empty-state">
            <CalendarDays aria-hidden="true" size={30} />
            <h3>No public events coming up</h3>
            <p>Check back soon or open an invitation from a club.</p>
          </div>
        )}
      </section>

      <section className="dashboard-clubs" aria-labelledby="clubs-heading">
        <div>
          <p className="eyebrow">Your organizations</p>
          <h2 id="clubs-heading">Clubs</h2>
          <ClubSwitcher />
          <details className="create-club-panel">
            <summary>
              <Plus aria-hidden="true" size={16} /> Create a club
            </summary>
            <div>
              <ClubForm />
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
