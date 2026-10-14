import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What UNEX collects, why, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="UNEX runs club pickleball events, matchmaking, and rankings. This page explains what we collect to do that, who can see it, and how to ask us to change or delete it."
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details.</strong> Your email address and a password
            if you sign up with email. If you use Sign in with Google, we
            receive your name, email address, and profile photo from Google. We
            never receive your Google password.
          </li>
          <li>
            <strong>Player profile.</strong> Your display name, profile photo,
            and the public profile address created for you.
          </li>
          <li>
            <strong>Play activity.</strong> Clubs you belong to, events you
            register for or check in to, queue and court assignments, matches,
            scores, results, confirmations, and the ratings and rankings
            calculated from them.
          </li>
          <li>
            <strong>Reports and disputes.</strong> If you dispute a result or
            report a problem, we keep what you submit, including any photos or
            files you upload as evidence.
          </li>
          <li>
            <strong>Technical data.</strong> Sign-in session cookies and basic
            request details such as your IP address, used to keep you signed in
            and to protect the service from abuse.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To create your account and keep you signed in.</li>
          <li>
            To run events: registration, check-in, queues, matchmaking, and
            recording results.
          </li>
          <li>To calculate ratings, leaderboards, and player statistics.</li>
          <li>
            To keep records fair: confirming results, handling disputes, and
            moderating reports.
          </li>
          <li>
            To send account emails, such as sign-up confirmation and password
            recovery.
          </li>
        </ul>
        <p>
          We do not sell your information, show ads, or use advertising or
          analytics trackers.
        </p>
      </section>

      <section>
        <h2>What is public</h2>
        <p>
          UNEX is built around shared competition records. Your display name,
          profile photo, public profile, match results, ratings, and leaderboard
          positions can be seen by anyone, including people who are not signed
          in. Event rosters may be visible to other participants and organizers.
          Your email address is never shown publicly.
        </p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We use a small number of service providers to run UNEX. They process
          data only on our behalf:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> for accounts, the database, and file
            storage.
          </li>
          <li>
            <strong>Vercel</strong> for hosting the website.
          </li>
          <li>
            <strong>Resend</strong> for sending account emails.
          </li>
          <li>
            <strong>Google</strong>, if you choose Sign in with Google.
          </li>
        </ul>
        <p>
          Club organizers can see the information needed to run their events. We
          may also disclose information if the law requires it.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We only use cookies that are needed to keep you signed in and to keep
          the service secure. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your account and play history while your account is active so
          your record stays complete. Evidence uploaded for disputes and reports
          is kept only for a limited review period and then deleted
          automatically, unless it is needed for an open case.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can update your display name and photo from your profile.</li>
          <li>
            You can ask us for a copy of your information, to correct it, or to
            delete your account by emailing{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
          </li>
          <li>
            If you delete your account, some records, such as the results of
            matches you played with others, may need to stay so other players’
            records remain accurate. We will tell you what we keep and why.
          </li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is sent over encrypted connections, and access to private data is
          restricted to the people who need it. No online service can promise
          perfect security, so please use a strong password and keep it to
          yourself.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          UNEX is not intended for children under 13, and we do not knowingly
          collect their information. If you believe a child has created an
          account, contact us and we will remove it.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we make significant changes, we will update the date at the top of
          this page and, where appropriate, let you know in the app or by email.
        </p>
      </section>
    </LegalPage>
  );
}
