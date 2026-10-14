import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using UNEX.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms apply when you use UNEX at unex.live. By creating an account or using the service, you agree to them."
    >
      <section>
        <h2>Your account</h2>
        <ul>
          <li>
            One person, one account. Use your real name or the name other
            players know you by, so results are credited to the right person.
          </li>
          <li>
            Keep your sign-in details secure. You are responsible for activity
            on your account.
          </li>
          <li>You must be at least 13 years old to create an account.</li>
        </ul>
      </section>

      <section>
        <h2>Fair play and accurate records</h2>
        <p>Rankings only mean something if the records are honest. Do not:</p>
        <ul>
          <li>Submit, confirm, or dispute results you know are false.</li>
          <li>
            Create extra accounts, play under someone else’s name, or let
            someone else play under yours.
          </li>
          <li>Manipulate ratings, leaderboards, queues, or matchmaking.</li>
          <li>
            Upload content that is unlawful, abusive, or not yours to share.
          </li>
          <li>
            Interfere with the service, for example by scraping it or attempting
            to bypass security controls.
          </li>
        </ul>
        <p>
          We may correct results, merge duplicate accounts, adjust ratings, or
          remove content to keep records accurate.
        </p>
      </section>

      <section>
        <h2>Clubs and events</h2>
        <p>
          Clubs and their organizers run their own events. They decide who can
          join, how events are run, and may check players in or out. UNEX
          provides the tools but is not responsible for the venue, the
          organization of an event, or what happens on court.
        </p>
      </section>

      <section>
        <h2>Play safely</h2>
        <p>
          Pickleball is a physical activity. You take part at your own risk and
          are responsible for your own health, equipment, and conduct during
          play.
        </p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          You keep ownership of what you upload, such as your profile photo or
          evidence for a dispute. You allow UNEX to store and display it as
          needed to run the service. Match results and rankings are shared
          records and are shown publicly, as described in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Suspension and closing your account</h2>
        <p>
          We may limit, suspend, or close accounts that break these terms or put
          other players or the service at risk. You can ask us to close your
          account at any time by emailing{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>The service is provided as is</h2>
        <p>
          We work to keep UNEX available and accurate, but we cannot promise it
          will always be uninterrupted or error-free, or that ratings will
          reflect every player’s true ability. To the extent the law allows,
          UNEX is not liable for indirect losses arising from use of the
          service.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as the service grows. If changes are
          significant, we will update the date at the top of this page and let
          you know in the app or by email. Continuing to use UNEX after a change
          means you accept the updated terms.
        </p>
      </section>
    </LegalPage>
  );
}
