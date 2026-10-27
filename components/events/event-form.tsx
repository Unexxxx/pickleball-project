"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Lock,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import { createEvent } from "@/lib/actions/events";

type EventType = "open_play" | "tournament";
type Format = "doubles" | "singles";
type RecordClass = "unranked" | "ranked";
type Status = "published" | "draft";

const DURATIONS = [2, 3, 4, 5];
const DEFAULT_HOURS = 3;

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
const addHours = (local: string, hours: number) =>
  localInputValue(new Date(new Date(local).getTime() + hours * 3_600_000));
const hoursBetween = (a: string, b: string) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;

const dateLabel = (local: string) =>
  new Date(local).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const timeLabel = (local: string) =>
  new Date(local).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Create an event in four short sections with a live preview of what players
 * will see. Fewer decisions: tap-to-choose chips with sensible defaults, the
 * end time follows the start (3 hours) until it's set by hand, and the submit
 * button says exactly what will happen. Motion follows emil-design-eng:
 * chips and steppers press to 0.97; the preview updates instantly (it changes
 * on every keystroke, so it never animates).
 */
export function EventForm({
  clubId,
  clubSlug,
  clubName,
  clubImageUrl,
}: {
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubImageUrl: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("open_play");
  const [format, setFormat] = useState<Format>("doubles");
  const [recordClass, setRecordClass] = useState<RecordClass>("unranked");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const [venue, setVenue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [courts, setCourts] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState<Status>("published");
  const [notes, setNotes] = useState("");

  const earliestStart = localInputValue(new Date());
  const duration = startsAt && endsAt ? hoursBetween(startsAt, endsAt) : null;
  const perGame = format === "doubles" ? 4 : 2;
  const playing = Math.min(capacity, courts * perGame);
  const resting = Math.max(0, capacity - playing);
  const submitLabel = status === "draft" ? "Save draft" : "Publish event";

  return (
    <form
      className="eb"
      onInvalid={(event) => {
        const field = event.target as HTMLInputElement;
        const label =
          field.labels?.[0]?.innerText.split("\n")[0]?.trim() ?? "Field";
        setMsg(`${label}: ${field.validationMessage}`);
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!startsAt || !endsAt)
          return setMsg("Choose when the event starts.");
        if (new Date(startsAt) <= new Date())
          return setMsg("The start time must be in the future.");
        if (new Date(endsAt) <= new Date(startsAt))
          return setMsg("The end time must be after the start time.");
        setSubmitting(true);
        setMsg(status === "draft" ? "Saving draft…" : "Publishing event…");
        const result = await createEvent({
          clubId,
          type,
          name,
          venue,
          mapUrl: mapUrl.trim(),
          notes: notes.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          capacity,
          courtCount: courts,
          formats: [format],
          recordClass,
          initialStatus: status,
          isPrivate,
          accessCode: isPrivate ? accessCode : null,
          idempotencyKey: crypto.randomUUID(),
        });
        if (result.ok) {
          setMsg("Done. Opening your event…");
          router.push(
            `/dashboard/clubs/${clubSlug}/events/${result.data.eventId}`,
          );
          router.refresh();
          return;
        }
        setSubmitting(false);
        setMsg(result.error.message);
      }}
    >
      <div className="eb__sections">
        <Section n={1} title="What" hint="Name it and pick how it's played.">
          <label className="eb-field">
            <span>Event name</span>
            <input
              name="name"
              required
              minLength={3}
              maxLength={120}
              value={name}
              placeholder="e.g. Saturday Morning Open Play"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Choice
            legend="Type"
            name="type"
            value={type}
            onChange={setType}
            options={[
              ["open_play", "Open play"],
              ["tournament", "Tournament"],
            ]}
          />
          <Choice
            legend="Format"
            name="format"
            value={format}
            onChange={setFormat}
            hint="Every game in the event uses this, and it can't be changed later."
            options={[
              ["doubles", "Doubles"],
              ["singles", "Singles"],
            ]}
          />
          <Choice
            legend="Results"
            name="recordClass"
            value={recordClass}
            onChange={setRecordClass}
            hint={
              recordClass === "ranked"
                ? "Confirmed scores count toward ratings and leaderboards."
                : "Games are recorded but don't change anyone's rating."
            }
            options={[
              ["unranked", "Unranked"],
              ["ranked", "Ranked"],
            ]}
          />
        </Section>

        <Section n={2} title="When & where">
          <div className="eb-row">
            <label className="eb-field">
              <span>Starts</span>
              <input
                name="startsAt"
                type="datetime-local"
                required
                min={earliestStart}
                value={startsAt}
                onChange={(event) => {
                  const next = event.target.value;
                  setStartsAt(next);
                  // The end follows the start until it's set by hand.
                  if (next && (!endTouched || !endsAt))
                    setEndsAt(
                      addHours(
                        next,
                        endsAt && startsAt
                          ? hoursBetween(startsAt, endsAt)
                          : DEFAULT_HOURS,
                      ),
                    );
                }}
              />
            </label>
            <label className="eb-field">
              <span>Ends</span>
              <input
                name="endsAt"
                type="datetime-local"
                required
                min={startsAt || earliestStart}
                value={endsAt}
                onChange={(event) => {
                  setEndTouched(true);
                  setEndsAt(event.target.value);
                }}
              />
            </label>
          </div>
          <div className="eb-chips" role="group" aria-label="Length">
            {DURATIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                className="eb-chip"
                aria-pressed={duration === hours}
                disabled={!startsAt}
                // A chosen length keeps following the start; only typing an
                // end time by hand pins it.
                onClick={() => {
                  setEndTouched(false);
                  setEndsAt(addHours(startsAt, hours));
                }}
              >
                {hours} hours
              </button>
            ))}
          </div>
          <label className="eb-field">
            <span>Venue</span>
            <input
              name="venue"
              required
              minLength={2}
              maxLength={200}
              value={venue}
              placeholder="e.g. Home Court Pickleball, Makati"
              onChange={(event) => setVenue(event.target.value)}
            />
          </label>
          <label className="eb-field">
            <span>
              <MapPinned aria-hidden="true" size={15} /> Map link{" "}
              <em>optional</em>
            </span>
            <input
              name="mapUrl"
              type="url"
              inputMode="url"
              value={mapUrl}
              placeholder="https://maps.google.com/…"
              onChange={(event) => setMapUrl(event.target.value)}
            />
          </label>
        </Section>

        <Section n={3} title="Players & courts">
          <div className="eb-row">
            <Stepper
              label="Players"
              value={capacity}
              min={2}
              max={1000}
              step={format === "doubles" ? 4 : 2}
              onChange={setCapacity}
            />
            <Stepper
              label="Courts"
              value={courts}
              min={1}
              max={100}
              step={1}
              onChange={setCourts}
            />
          </div>
          <p className="eb-hint" aria-live="polite">
            {Math.min(courts, Math.floor(capacity / perGame))} games at a time ·{" "}
            {playing} playing
            {resting ? ` · ${resting} waiting their turn` : ""}
          </p>
        </Section>

        <Section n={4} title="Who can join">
          <Choice
            legend="Visibility"
            name="visibility"
            value={isPrivate ? "private" : "public"}
            onChange={(value) => setIsPrivate(value === "private")}
            hint={
              isPrivate
                ? "Hidden from listings. Club members can join; others need the passcode."
                : "Anyone can find it on the club's schedule and join."
            }
            options={[
              ["public", "Public"],
              ["private", "Private"],
            ]}
          />
          {isPrivate ? (
            <label className="eb-field">
              <span>Passcode</span>
              <input
                name="accessCode"
                required
                minLength={4}
                maxLength={32}
                autoComplete="new-password"
                value={accessCode}
                placeholder="At least 4 characters"
                onChange={(event) => setAccessCode(event.target.value)}
              />
            </label>
          ) : null}
          <Choice
            legend="When it goes live"
            name="status"
            value={status}
            onChange={setStatus}
            hint={
              status === "draft"
                ? "Only club staff can see it until you publish it."
                : "Players can see and join it right away."
            }
            options={[
              ["published", "Publish now"],
              ["draft", "Save as draft"],
            ]}
          />
          <details className="eb-notes" open={notes.length > 0}>
            <summary>Add notes for players</summary>
            <label className="eb-field">
              <span className="sr-only">Notes for players</span>
              <textarea
                name="notes"
                rows={6}
                maxLength={10_000}
                value={notes}
                placeholder="Payment, skill level, what to bring, court rules…"
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </details>
        </Section>
      </div>

      <aside className="eb__preview" aria-label="Preview">
        <p className="eb__preview-label">Preview · what players will see</p>
        <article className="eb-card">
          <header className="eb-card__club">
            <span
              className="ph-row__avatar"
              aria-hidden="true"
              style={
                clubImageUrl
                  ? { backgroundImage: `url(${clubImageUrl})` }
                  : undefined
              }
            >
              {clubImageUrl ? null : clubName.charAt(0).toUpperCase()}
            </span>
            <span>{clubName}</span>
          </header>
          <div className="eb-card__badges">
            {status === "draft" ? (
              <span className="is-draft">Draft</span>
            ) : null}
            <span>{type === "open_play" ? "Open play" : "Tournament"}</span>
            <span>{format === "doubles" ? "Doubles" : "Singles"}</span>
            {recordClass === "ranked" ? (
              <span className="is-ranked">
                <Trophy aria-hidden="true" size={12} /> Ranked
              </span>
            ) : null}
            {isPrivate ? (
              <span>
                <Lock aria-hidden="true" size={12} /> Private
              </span>
            ) : null}
          </div>
          <h2 className={name.trim() ? undefined : "is-placeholder"}>
            {name.trim() || "Your event name"}
          </h2>
          <ul className="eb-card__facts">
            <li className={startsAt ? undefined : "is-placeholder"}>
              <CalendarDays aria-hidden="true" size={16} />
              {startsAt ? (
                <span>
                  {dateLabel(startsAt)} · {timeLabel(startsAt)}
                  {endsAt ? ` – ${timeLabel(endsAt)}` : ""}
                </span>
              ) : (
                <span>Pick a date and time</span>
              )}
            </li>
            <li className={venue.trim() ? undefined : "is-placeholder"}>
              <MapPin aria-hidden="true" size={16} />
              <span>{venue.trim() || "Add a venue"}</span>
            </li>
            <li>
              <Users aria-hidden="true" size={16} />
              <span>
                {capacity} spots · {courts} {courts === 1 ? "court" : "courts"}
              </span>
            </li>
          </ul>
          {notes.trim() ? (
            <p className="eb-card__notes">{notes.trim()}</p>
          ) : null}
        </article>
      </aside>

      <div className="eb__submit">
        <p role="status" aria-live="polite">
          {msg}
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? "Working…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="eb-section" aria-labelledby={`eb-step-${n}`}>
      <header>
        <span className="eb-section__n" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 id={`eb-step-${n}`}>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
      </header>
      <div className="eb-section__body">{children}</div>
    </section>
  );
}

/** Tap-to-choose chips backed by real radio inputs (keyboard + forms work). */
function Choice<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
  hint?: string;
}) {
  return (
    <fieldset className="eb-choice">
      <legend>{legend}</legend>
      <div className="eb-chips">
        {options.map(([option, label]) => (
          <label key={option} className="eb-chip">
            <input
              className="sr-only"
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {hint ? <p className="eb-hint">{hint}</p> : null}
    </fieldset>
  );
}

/** A number with − / + buttons; typing a value still works. */
function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="eb-field eb-stepper">
      <span id={`eb-${label}`}>{label}</span>
      <div className="eb-stepper__control">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          <Minus aria-hidden="true" size={16} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-labelledby={`eb-${label}`}
          min={min}
          max={max}
          value={value}
          // Clamp when leaving the field, not while typing ("12" starts as "1").
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(Math.round(next));
          }}
          onBlur={() => onChange(clamp(value))}
        />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          <Plus aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
