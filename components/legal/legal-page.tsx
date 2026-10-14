import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-page">
      <header>
        <p className="legal-kicker">Last updated {LEGAL_LAST_UPDATED}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      <div className="legal-body">{children}</div>
      <footer className="legal-footer">
        <p>
          Questions? Email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </nav>
      </footer>
    </main>
  );
}
