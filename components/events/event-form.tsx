"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  KeyRound,
  ListOrdered,
  Lock,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { createEvent } from "@/lib/actions/events";

type EventType = "open_play" | "tournament";
type Format = "doubles" | "singles";
type RecordClass = "unranked" | "ranked";
type Status = "published" | "draft";

// Length chips; the end time is the start plus one of these.
const DURATIONS = [3, 4, 5, 6, 7, 8];
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
const addHours = (local: string, hours: number) =>
  localInputValue(new Date(new Date(local).getTime() + hours * 3_600_000));
/** "7" + "PM" → "19:00". */
const hourTo24 = (hour12: number, meridiem: "AM" | "PM") =>
  `${String((hour12 % 12) + (meridiem === "PM" ? 12 : 0)).padStart(2, "0")}:00`;

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
 * start is a date plus an hour (1–12, AM/PM) — or an exact time if needed —
 * the end is the start plus a 3–8 hour length, and the submit button says
 * exactly what will happen. Motion follows emil-design-eng:
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
  const [date, setDate] = useState("");
  const [hour12, setHour12] = useState(7);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("AM");
  const [exact, setExact] = useState(false);
  const [exactTime, setExactTime] = useState("07:00");
  const [hours, setHours] = useState(DURATIONS[0]!);
  const [venue, setVenue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [courts, setCourts] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [status, setStatus] = useState<Status>("published");
  const [notes, setNotes] = useState("");

  const today = localInputValue(new Date()).slice(0, 10);
  const startTime = exact ? exactTime : hourTo24(hour12, meridiem);
  const startsAt = date && startTime ? `${date}T${startTime}` : "";
  const endsAt = startsAt ? addHours(startsAt, hours) : "";
  const endsNextDay = Boolean(endsAt) && endsAt.slice(0, 10) !== date;
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
        if (!startsAt) return setMsg("Choose the date and start time.");
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
              <span>Date</span>
              <input
                name="date"
                type="date"
                required
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <div className="eb-field">
              <span id="eb-start-time">Start time</span>
              <div className="eb-time">
                {exact ? (
                  <input
                    type="time"
                    required
                    aria-labelledby="eb-start-time"
                    value={exactTime}
                    onChange={(event) => setExactTime(event.target.value)}
                  />
                ) : (
                  <>
                    <select
                      aria-label="Start hour"
                      value={hour12}
                      onChange={(event) =>
                        setHour12(Number(event.target.value))
                      }
                    >
                      {HOURS_12.map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                    <div
                      className="eb-chips"
                      role="group"
                      aria-label="AM or PM"
                    >
                      {(["AM", "PM"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="eb-chip"
                          aria-pressed={meridiem === m}
                          onClick={() => setMeridiem(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {/* Icon-only switch between hour picking and an exact time. */}
                <button
                  type="button"
                  className="eb-icon-button"
                  aria-label={
                    exact ? "Pick an hour instead" : "Type an exact time"
                  }
                  title={exact ? "Pick an hour instead" : "Type an exact time"}
                  onClick={() => {
                    // Carry the picked hour into the exact field, and back.
                    if (!exact) setExactTime(hourTo24(hour12, meridiem));
                    else {
                      const [h] = exactTime.split(":").map(Number);
                      if (Number.isFinite(h)) {
                        setHour12(((h! + 11) % 12) + 1);
                        setMeridiem(h! >= 12 ? "PM" : "AM");
                      }
                    }
                    setExact(!exact);
                  }}
                >
                  {exact ? (
                    <ListOrdered aria-hidden="true" size={18} />
                  ) : (
                    <Clock3 aria-hidden="true" size={18} />
                  )}
                </button>
              </div>
              {/* The end time, stated plainly right under the start. */}
              <p className="eb-ends" aria-live="polite">
                <CalendarDays aria-hidden="true" size={16} />
                {endsAt ? (
                  <span>
                    Ends <strong>{timeLabel(endsAt)}</strong>
                    {endsNextDay ? " the next day" : ""}
                  </span>
                ) : (
                  <span>Pick a date to see when it ends</span>
                )}
              </p>
            </div>
          </div>
          <fieldset className="eb-choice">
            <legend>Length</legend>
            <div className="eb-chips">
              {DURATIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="eb-chip"
                  aria-pressed={hours === h}
                  onClick={() => setHours(h)}
                >
                  {h} hours
                </button>
              ))}
            </div>
          </fieldset>
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
          <p className="eb-ends eb-courts" aria-live="polite">
            <span>
              <strong>
                {Math.min(courts, Math.floor(capacity / perGame))}
              </strong>{" "}
              games at a time
            </span>
            <span>
              <strong>{playing}</strong> playing
            </span>
            {resting ? (
              <span>
                <strong>{resting}</strong> waiting their turn
              </span>
            ) : null}
          </p>
        </Section>

        <Section n={4} title="Who can join">
          <Choice
            legend="Joining"
            name="visibility"
            value={isPrivate ? "private" : "public"}
            onChange={(value) => setIsPrivate(value === "private")}
            hint={
              isPrivate
                ? "Listed on the schedule, but joining takes the passcode — share it with the players you invite."
                : "Listed on the schedule. Anyone can request to join, and you or your staff approve each request."
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
                placeholder="At least 4 characters, e.g. dink2026"
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
                : "Players can see it on the schedule right away."
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
            <li>
              {isPrivate ? (
                <KeyRound aria-hidden="true" size={16} />
              ) : (
                <UserCheck aria-hidden="true" size={16} />
              )}
              <span>
                {isPrivate
                  ? "Join with the passcode"
                  : "Request to join · organizer approves"}
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
  // What's in the box while typing; null shows the value. Keeps a cleared
  // box empty instead of "0", so typing "5" doesn't become "05".
  const [draft, setDraft] = useState<string | null>(null);
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
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-labelledby={`eb-${label}`}
          value={draft ?? String(value)}
          // Clamp when leaving the field, not while typing ("12" starts as "1").
          onChange={(event) => {
            const digits = event.target.value
              .replace(/\D/g, "")
              .replace(/^0+(?=\d)/, "")
              .slice(0, String(max).length);
            setDraft(digits);
            if (digits) onChange(Number(digits));
          }}
          onBlur={() => {
            setDraft(null);
            onChange(clamp(value));
          }}
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
