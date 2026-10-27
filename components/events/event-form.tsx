"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinned, MessageSquareText } from "lucide-react";
import { createEvent } from "@/lib/actions/events";

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventForm({
  clubId,
  clubSlug,
}: {
  clubId: string;
  clubSlug: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [isPrivate, setIsPrivate] = useState(false);
  const [format, setFormat] = useState<"doubles" | "singles">("doubles");
  const [initialStatus, setInitialStatus] = useState<"published" | "draft">(
    "published",
  );

  const earliestStart = localInputValue(new Date());

  return (
    <form
      className="event-create-form"
      onInvalid={(event) => {
        const field = event.target as HTMLInputElement;
        const label = field.labels?.[0]?.innerText.split("\n")[0] ?? "Field";
        setMsg(`${label}: ${field.validationMessage}`);
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!startsAt || !endsAt) {
          setMsg("Start and end time are required.");
          return;
        }
        if (new Date(startsAt) <= new Date()) {
          setMsg("Start time must be in the future.");
          return;
        }
        if (new Date(endsAt) <= new Date(startsAt)) {
          setMsg("End time must be after the start time.");
          return;
        }
        const form = new FormData(event.currentTarget);
        setMsg("Creating event…");
        const result = await createEvent({
          clubId,
          type: form.get("type"),
          name,
          venue,
          mapUrl: mapUrl.trim(),
          notes: notes.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          capacity,
          courtCount: form.get("courtCount"),
          formats: [format],
          recordClass: form.get("recordClass"),
          initialStatus,
          isPrivate,
          accessCode: isPrivate ? form.get("accessCode") : null,
          idempotencyKey: crypto.randomUUID(),
        });
        if (result.ok) {
          setMsg("Event created. Opening event…");
          router.push(
            `/dashboard/clubs/${clubSlug}/events/${result.data.eventId}`,
          );
          router.refresh();
          return;
        }
        setMsg(result.error.message);
      }}
    >
      <div className="form-section-heading">
        <p className="eyebrow">Event details</p>
      </div>
      <div className="form-grid">
        <label>
          Name
          <input
            name="name"
            required
            minLength={3}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Type
          <select name="type">
            <option value="open_play">Open play</option>
            <option value="tournament">Tournament</option>
          </select>
        </label>
        <label className="form-span-2">
          Venue
          <input
            name="venue"
            required
            minLength={2}
            maxLength={200}
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
          />
        </label>
        <label className="form-span-2">
          <span className="field-label-with-icon">
            <MapPinned aria-hidden="true" size={17} /> Map location link
          </span>
          <input
            name="mapUrl"
            type="url"
            inputMode="url"
            value={mapUrl}
            onChange={(event) => setMapUrl(event.target.value)}
            placeholder="https://maps.google.com/…"
          />
          <small>
            Optional. Paste a Google Maps, Apple Maps, or other HTTPS map link.
          </small>
        </label>
        <label>
          Starts
          <input
            name="startsAt"
            type="datetime-local"
            required
            min={earliestStart}
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </label>
        <label>
          Ends
          <input
            name="endsAt"
            type="datetime-local"
            required
            min={startsAt || undefined}
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </label>
        <label>
          Capacity
          <input
            name="capacity"
            type="number"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            min="2"
            max="1000"
          />
        </label>
        <label>
          Courts
          <input
            name="courtCount"
            type="number"
            defaultValue="4"
            min="1"
            max="100"
          />
        </label>
        <label className="form-span-2">
          Record
          <select name="recordClass">
            <option value="unranked">Unranked</option>
            <option value="ranked">Ranked</option>
          </select>
        </label>
        <fieldset className="form-span-2 event-visibility-fieldset">
          <legend>Match format</legend>
          <label
            className={`event-visibility-option ${format === "doubles" ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="format"
              value="doubles"
              checked={format === "doubles"}
              onChange={() => setFormat("doubles")}
            />
            <span>
              <strong>Doubles</strong>
              <small>
                Two players per side. Matchmaking builds teams of two.
              </small>
            </span>
          </label>
          <label
            className={`event-visibility-option ${format === "singles" ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="format"
              value="singles"
              checked={format === "singles"}
              onChange={() => setFormat("singles")}
            />
            <span>
              <strong>Singles</strong>
              <small>One player per side.</small>
            </span>
          </label>
          <small>
            The whole event uses this format and it cannot be changed later.
          </small>
        </fieldset>
        <label className="form-span-2">
          <span className="field-label-with-icon">
            <MessageSquareText aria-hidden="true" size={17} /> Event notes
          </span>
          <textarea
            name="notes"
            rows={10}
            maxLength={10_000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={
              "Add payment instructions, skill-level guidance, what to bring, court rules, and other information players should know."
            }
          />
          <small>
            Optional. Line breaks and lists will appear exactly as entered.
          </small>
        </label>
        <fieldset className="form-span-2 event-visibility-fieldset">
          <legend>Publication status</legend>
          <label
            className={`event-visibility-option ${initialStatus === "published" ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="publicationStatus"
              value="published"
              checked={initialStatus === "published"}
              onChange={() => setInitialStatus("published")}
            />
            <span>
              <strong>Publish now</strong>
              <small>
                The event becomes available immediately according to its public
                or private visibility setting.
              </small>
            </span>
          </label>
          <label
            className={`event-visibility-option ${initialStatus === "draft" ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="publicationStatus"
              value="draft"
              checked={initialStatus === "draft"}
              onChange={() => setInitialStatus("draft")}
            />
            <span>
              <strong>Save as draft</strong>
              <small>
                Only club organizers can see it until it is published later.
              </small>
            </span>
          </label>
        </fieldset>
        <fieldset className="form-span-2 event-visibility-fieldset">
          <legend>Who can find and join this event?</legend>
          <label
            className={`event-visibility-option ${!isPrivate ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={!isPrivate}
              onChange={() => setIsPrivate(false)}
            />
            <span>
              <strong>Public</strong>
              <small>
                Visible to every player and open from event listings.
              </small>
            </span>
          </label>
          <label
            className={`event-visibility-option ${isPrivate ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={isPrivate}
              onChange={() => setIsPrivate(true)}
            />
            <span>
              <strong>Private</strong>
              <small>
                Hidden from public listings. Club members can join, or other
                players can use the passcode.
              </small>
            </span>
          </label>
          {isPrivate ? (
            <label className="event-passcode">
              Event passcode
              <input
                name="accessCode"
                required
                minLength={4}
                maxLength={32}
                autoComplete="new-password"
                placeholder="At least 4 characters"
              />
              <small>Share this separately with invited players.</small>
            </label>
          ) : null}
        </fieldset>
      </div>
      <button type="submit">
        {initialStatus === "published"
          ? "Create and publish event"
          : "Save draft"}
      </button>
      <p role="status" aria-live="polite">
        {msg}
      </p>
    </form>
  );
}
