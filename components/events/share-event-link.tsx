"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

export function ShareEventLink({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="event-share" aria-labelledby="share-event-heading">
      <div>
        <p className="event-share__label" id="share-event-heading">
          <Link2 aria-hidden="true" size={16} /> Shareable event link
        </p>
        <p>Send this link to players so they can view the details and join.</p>
      </div>
      <div className="event-share__controls">
        <input
          aria-label="Shareable event link"
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button className="button-secondary" type="button" onClick={copyLink}>
          {copied ? (
            <Check aria-hidden="true" size={17} />
          ) : (
            <Copy aria-hidden="true" size={17} />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Event link copied to clipboard." : ""}
      </span>
    </section>
  );
}
