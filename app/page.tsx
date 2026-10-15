import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  Radio,
  Shuffle,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { LandingMotion } from "@/components/marketing/landing-motion";
import { PinnedCourtHero } from "@/components/marketing/pinned-court-hero";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Tells search engines the site's name is "UNEX" (shown above the result)
// and who publishes it.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ["UNEX Pickleball", "unex.live"],
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: LEGAL_CONTACT_EMAIL,
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      applicationCategory: "SportsApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
    },
  ],
};

const steps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Check in",
    body: "Players scan in on arrival. UNEX logs rating, availability, and who they haven't played yet today.",
  },
  {
    number: "02",
    icon: Shuffle,
    title: "Get matched",
    body: "The queue balances skill and wait time while steering clear of repeat teammates and opponents.",
  },
  {
    number: "03",
    icon: MapPin,
    title: "Walk to your court",
    body: "A court assignment posts to the queue the moment it's ready, and scores post back the moment the match ends.",
  },
];

const features = [
  {
    icon: Radio,
    title: "Live queues & court boards",
    body: "Standby, upcoming, and bench order update in real time on a screen every player can see.",
  },
  {
    icon: Shuffle,
    title: "Matchmaking that remembers",
    body: "Weighs rating and wait time together, and steers clear of yesterday's pairings.",
  },
  {
    icon: Trophy,
    title: "Ratings that get smarter",
    body: "A deterministic rating with built-in uncertainty — confident after five matches, precise after fifty.",
  },
  {
    icon: CalendarDays,
    title: "Full event lifecycle",
    body: "Create, edit, reschedule, start, and complete events — with courts and check-in handled per session.",
  },
  {
    icon: BadgeCheck,
    title: "Verified players, one record",
    body: "One real identity per player, shared across clubs without mixing club data.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Row-level security keeps every club's roster, scores, and disputes visible only to their own members.",
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingMotion />
      <main className="ls-page">
        {/* HERO */}
        <PinnedCourtHero />

        {/* HOW IT WORKS */}
        <section
          className="ls-steps-section"
          aria-labelledby="how-it-works-title"
        >
          <div className="ls-container">
            <div className="ls-reveal ls-steps-heading">
              <h2 id="how-it-works-title" className="ls-section-title">
                From check-in to court in three steps.
              </h2>
              <p className="ls-steps-lede">
                No clipboards, no shouted names — everything below happens on a
                screen at the courtside table.
              </p>
            </div>
            <div className="ls-steps-grid">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="ls-reveal"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <p className="ls-step-number">{step.number}</p>
                  <span className="feature-icon" aria-hidden="true">
                    <step.icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="ls-step-title">{step.title}</h3>
                  <p className="ls-step-body">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section
          className="ls-features-section"
          aria-labelledby="features-title"
        >
          <div className="ls-container">
            <h2
              id="features-title"
              className="ls-reveal ls-section-title ls-features-title"
            >
              Everything an open play organizer used to track on paper.
            </h2>
            <div className="ls-features-grid">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="ls-reveal ls-feature-card"
                  style={{ transitionDelay: `${(index % 3) * 60}ms` }}
                >
                  <span className="feature-icon" aria-hidden="true">
                    <feature.icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CINEMATIC VIDEO BAND */}
        <section className="ls-cine">
          <video
            className="ls-video ls-parallax"
            data-speed="0.14"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            data-scrub
          >
            <source src="/videos/paddle-parallax.mp4" type="video/mp4" />
          </video>
          <div className="ls-cine-scrim" aria-hidden="true" />
          <div className="ls-cine-inner ls-reveal">
            <p className="ls-cine-kicker">BUILT FOR THE RALLY</p>
            <h2 className="ls-cine-title">
              Every dink, drive and drop —<br />
              tracked the moment it happens.
            </h2>
            <Link href="/dashboard" className="button ls-cine-cta">
              Start your first event
            </Link>
          </div>
        </section>

        {/* PRODUCT PREVIEW DARK BAND */}
        <section className="ls-preview" aria-labelledby="organizer-title">
          <svg
            className="ls-preview-rings"
            viewBox="0 0 420 420"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="210" cy="210" r="209" />
            <circle cx="210" cy="210" r="150" />
            <circle cx="210" cy="210" r="90" />
          </svg>
          <div className="ls-reveal ls-preview-grid">
            <div>
              <p className="ls-preview-kicker">FOR ORGANIZERS</p>
              <h2 id="organizer-title" className="ls-preview-title">
                Run the whole session from one board.
              </h2>
              <p className="ls-preview-body">
                Courts, check-in, standby and bench order stay in sync with what
                players see on their phones — start to complete, without a
                second app.
              </p>
              <Link href="/dashboard" className="button">
                Open the organizer view
              </Link>
            </div>
            <div className="ls-preview-card" aria-hidden="true">
              <div className="ls-preview-card-header">
                <span>Saturday Open Play</span>
                <span className="ls-preview-card-tag">6 courts active</span>
              </div>
              <div className="ls-preview-board">
                <div className="ls-preview-tile">
                  <p>COURT 1</p>
                  <span>In progress · 8:04</span>
                </div>
                <div className="ls-preview-tile ls-preview-tile--ready">
                  <p>COURT 2</p>
                  <span>Ready to start</span>
                </div>
                <div className="ls-preview-tile">
                  <p>COURT 3</p>
                  <span>In progress · 3:12</span>
                </div>
                <div className="ls-preview-tile ls-preview-tile--wide">
                  <p>STANDBY</p>
                  <span>4 players waiting · avg 6 min</span>
                </div>
                <div className="ls-preview-tile">
                  <p>BENCH</p>
                  <span>2 next up</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section className="ls-final-cta">
          <h2 className="ls-reveal ls-final-cta-title">
            Ready to run a better open play?
          </h2>
          <p
            className="ls-reveal ls-final-cta-lede"
            style={{ transitionDelay: "60ms" }}
          >
            Set up your first event in under ten minutes.
          </p>
          <div
            className="ls-reveal ls-final-cta-actions"
            style={{ transitionDelay: "120ms" }}
          >
            <Link href="/dashboard" className="button">
              Start your first event
            </Link>
            <Link href="/leaderboards" className="button button-secondary">
              See the rankings
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="ls-footer">
          <div>
            <div className="ls-footer-brand">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" fill="var(--dink-volt)" />
                <circle cx="9" cy="9.5" r="1.1" fill="var(--dink-volt-ink)" />
                <circle
                  cx="14.5"
                  cy="8.5"
                  r="1.1"
                  fill="var(--dink-volt-ink)"
                />
                <circle
                  cx="15.5"
                  cy="13.5"
                  r="1.1"
                  fill="var(--dink-volt-ink)"
                />
                <circle
                  cx="10.5"
                  cy="14.5"
                  r="1.1"
                  fill="var(--dink-volt-ink)"
                />
                <circle
                  cx="12.2"
                  cy="11.5"
                  r="1.1"
                  fill="var(--dink-volt-ink)"
                />
              </svg>
              <span>UNEX</span>
            </div>
            <p className="ls-footer-about">
              UNEX is a pickleball club app for running open play events,
              matchmaking players onto courts, and keeping fair rankings. If you
              sign in with Google, we only use your name, email address, and
              profile photo to create your player account. UNEX does not use
              Google data for AI, image generation, or any other content
              generation. See our <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <p className="ls-footer-copy">
              © {new Date().getFullYear()} UNEX. Built for the court.
            </p>
          </div>
          <nav className="ls-footer-cols" aria-label="Footer">
            <div>
              <span>PRODUCT</span>
              <Link href="/dashboard">Events</Link>
              <Link href="/dashboard">Matchmaking</Link>
              <Link href="/leaderboards">Rankings</Link>
            </div>
            <div>
              <span>LEGAL</span>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </nav>
        </footer>
      </main>
    </>
  );
}
