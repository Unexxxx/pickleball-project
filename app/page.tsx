import Link from "next/link";
import { ArrowRight, BadgeCheck, History, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">
            <BadgeCheck aria-hidden="true" size={16} /> Trusted competition
            records
          </p>
          <h1>Play. Confirm. Climb.</h1>
          <p className="hero__lede">
            Run fair club events, confirm every result, and build one auditable
            pickleball record that follows you everywhere.
          </p>
          <div className="hero__actions">
            <Link href="/register">
              Create your player account{" "}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link href="/leaderboards">Explore the rankings</Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="why-title">
        <p
          className="eyebrow"
          style={{ background: "var(--muted)", color: "var(--primary)" }}
        >
          Built for fair play
        </p>
        <h2 id="why-title">Competition records players can trust</h2>
        <div className="feature-grid">
          <article>
            <span className="feature-icon">
              <BadgeCheck aria-hidden="true" />
            </span>
            <h3>Verified players</h3>
            <p>
              One real identity per player, shared across clubs without mixing
              club data.
            </p>
          </article>
          <article>
            <span className="feature-icon">
              <History aria-hidden="true" />
            </span>
            <h3>Auditable results</h3>
            <p>
              Confirmations, corrections, and disputes stay attached to every
              official result.
            </p>
          </article>
          <article>
            <span className="feature-icon">
              <Trophy aria-hidden="true" />
            </span>
            <h3>Meaningful rankings</h3>
            <p>
              Deterministic ratings and statistics make every move on the
              leaderboard explainable.
            </p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
