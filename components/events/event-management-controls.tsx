"use client";

import {
  CalendarClock,
  LockKeyhole,
  Pencil,
  Play,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { transitionEvent, updateEventDetails } from "@/lib/actions/events";

type EditableEvent = {
  id: string;
  name: string;
  venue: string;
  mapUrl: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: string;
  version: number;
};

function localInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventManagementControls({
  clubId,
  clubSlug,
  event,
}: {
  clubId: string;
  clubSlug: string;
  event: EditableEvent;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const earliestStart = localInputValue(new Date().toISOString());

  async function save(formData: FormData) {
    setPending(true);
    setMessage("Saving event details…");
    const startsAt = String(formData.get("startsAt"));
    const endsAt = String(formData.get("endsAt"));
    if (new Date(startsAt) <= new Date()) {
      setPending(false);
      setMessage("Start time must be in the future.");
      return;
    }
    const result = await updateEventDetails({
      clubId,
      clubSlug,
      eventId: event.id,
      expectedVersion: event.version,
      name: formData.get("name"),
      venue: formData.get("venue"),
      mapUrl: formData.get("mapUrl"),
      notes: formData.get("notes"),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      capacity: formData.get("capacity"),
      idempotencyKey: crypto.randomUUID(),
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    setEditing(false);
    setMessage("Event details saved.");
    router.refresh();
  }

  async function cancelEvent() {
    setPending(true);
    setMessage("Canceling event…");
    const result = await transitionEvent({
      clubId,
      eventId: event.id,
      expectedVersion: event.version,
      transition: "canceled",
      idempotencyKey: crypto.randomUUID(),
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    setConfirmingCancel(false);
    setMessage("Event canceled. Players can no longer join.");
    router.refresh();
  }

  async function changeEventState(
    transition: "registration_closed" | "in_progress" | "completed",
  ) {
    setPending(true);
    setMessage(
      transition === "in_progress"
        ? "Starting event…"
        : "Closing registration…",
    );
    const result = await transitionEvent({
      clubId,
      eventId: event.id,
      expectedVersion: event.version,
      transition,
      idempotencyKey: crypto.randomUUID(),
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    if (transition === "completed") {
      setConfirmingEnd(false);
      setMessage("Event completed. Match history is preserved.");
      router.refresh();
      return;
    }
    if (transition === "in_progress") {
      router.push(`/dashboard/clubs/${clubSlug}/events/${event.id}/check-in`);
      return;
    }
    setMessage("Registration closed. You can start the event when ready.");
    router.refresh();
  }

  return (
    <section
      className="event-management-card"
      aria-labelledby="manage-event-heading"
    >
      <div className="event-management-heading">
        <div>
          <p className="eyebrow">Club controls</p>
          <h2 id="manage-event-heading">Manage event</h2>
          <p>Edit published details, reschedule, or cancel this event.</p>
        </div>
        {!editing &&
        event.status !== "canceled" &&
        event.status !== "completed" ? (
          <button
            className="button-secondary"
            type="button"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" size={17} /> Edit details
          </button>
        ) : null}
      </div>

      {event.status === "published" ||
      event.status === "registration_closed" ? (
        <div className="event-start-controls">
          <div>
            <strong>Ready to run the event?</strong>
            <p>
              Starting closes registration and opens club-managed check-in and
              queueing.
            </p>
          </div>
          <div>
            {event.status === "published" ? (
              <button
                className="button-secondary"
                type="button"
                disabled={pending}
                onClick={() => changeEventState("registration_closed")}
              >
                <LockKeyhole aria-hidden="true" size={17} /> Close registration
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => changeEventState("in_progress")}
            >
              <Play aria-hidden="true" size={17} />{" "}
              {pending ? "Starting…" : "Start event"}
            </button>
          </div>
        </div>
      ) : null}

      {event.status === "in_progress" ? (
        <div className="event-start-controls">
          <div>
            <strong>Finished playing?</strong>
            <p>
              Finish active matches first. Ending checks everyone out and clears
              the waiting queue. Match history is preserved.
            </p>
          </div>
          {confirmingEnd ? (
            <div>
              <button
                disabled={pending}
                onClick={() => setConfirmingEnd(false)}
              >
                Keep event running
              </button>
              <button
                disabled={pending}
                onClick={() => changeEventState("completed")}
              >
                {pending ? "Ending…" : "Confirm end event"}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingEnd(true)}>End event</button>
          )}
        </div>
      ) : null}
      {event.status === "completed" ? (
        <p>Event completed. Match history is available.</p>
      ) : null}

      {editing ? (
        <form className="event-edit-form" action={save}>
          <div className="form-grid">
            <label className="form-span-2">
              Event name
              <input
                name="name"
                required
                minLength={3}
                maxLength={120}
                defaultValue={event.name}
              />
            </label>
            <label className="form-span-2">
              Venue
              <input
                name="venue"
                required
                maxLength={200}
                defaultValue={event.venue}
              />
            </label>
            <label className="form-span-2">
              Map location link
              <input
                name="mapUrl"
                type="url"
                inputMode="url"
                placeholder="https://maps.google.com/…"
                defaultValue={event.mapUrl ?? ""}
              />
            </label>
            <label>
              <span className="field-label-with-icon">
                <CalendarClock aria-hidden="true" size={17} /> Starts
              </span>
              <input
                name="startsAt"
                type="datetime-local"
                required
                min={earliestStart}
                defaultValue={localInputValue(event.startsAt)}
              />
            </label>
            <label>
              <span className="field-label-with-icon">
                <CalendarClock aria-hidden="true" size={17} /> Ends
              </span>
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={localInputValue(event.endsAt)}
              />
            </label>
            <label>
              Capacity
              <input
                name="capacity"
                type="number"
                min={2}
                max={1000}
                required
                defaultValue={event.capacity}
              />
            </label>
            <label className="form-span-2">
              Event notes
              <textarea
                name="notes"
                rows={10}
                maxLength={10_000}
                defaultValue={event.notes ?? ""}
              />
            </label>
          </div>
          <div className="event-edit-actions">
            <button type="submit" disabled={pending}>
              <Save aria-hidden="true" size={17} />{" "}
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              <X aria-hidden="true" size={17} /> Close
            </button>
          </div>
        </form>
      ) : null}

      {event.status === "completed" ? null : event.status !== "canceled" ? (
        <div className="event-cancel-zone">
          {!confirmingCancel ? (
            <button
              className="button-danger-outline"
              type="button"
              onClick={() => setConfirmingCancel(true)}
            >
              <Trash2 aria-hidden="true" size={17} /> Cancel event
            </button>
          ) : (
            <div className="event-cancel-confirmation" role="alert">
              <div>
                <strong>Cancel this event?</strong>
                <p>
                  Players will see that it was canceled and registration will
                  close.
                </p>
              </div>
              <div>
                <button
                  className="button-danger"
                  type="button"
                  disabled={pending}
                  onClick={cancelEvent}
                >
                  {pending ? "Canceling…" : "Yes, cancel event"}
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep event
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="event-canceled-message">
          This event is canceled and can no longer accept registrations.
        </p>
      )}

      <p className="event-management-status" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
