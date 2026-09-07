"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  eventSchema,
  externalEventImportSchema,
  eventTransitionSchema,
  eventUpdateSchema,
  registrationSchema,
} from "@/lib/validation/events";
import { failure, success } from "@/lib/actions/result";

const eventFieldLabels: Record<string, string> = {
  name: "Event name",
  venue: "Venue",
  mapUrl: "Map location link",
  notes: "Event notes",
  startsAt: "Start time",
  endsAt: "End time",
  capacity: "Capacity",
  courtCount: "Courts",
  accessCode: "Event passcode",
};

function eventValidationMessage(fields: Record<string, string[]>) {
  const first = Object.entries(fields).find(([, messages]) => messages.length);
  if (!first) return "Check the event details.";
  const [field, messages] = first;
  return `${eventFieldLabels[field] ?? "Event details"}: ${messages[0]}`;
}

export async function createEvent(input: unknown) {
  const requestId = crypto.randomUUID();
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const { externalImport: rawImport, ...rawEvent } = raw;
  const p = eventSchema.safeParse(rawEvent);
  const imported =
    rawImport === undefined
      ? null
      : externalEventImportSchema.safeParse(rawImport);
  if (!p.success)
    return failure(
      "VALIDATION_FAILED",
      eventValidationMessage(p.error.flatten().fieldErrors),
      requestId,
      p.error.flatten().fieldErrors,
    );
  if (imported && !imported.success)
    return failure(
      "VALIDATION_FAILED",
      "Check the imported roster.",
      requestId,
    );
  const s = await createClient();
  const { data, error } = await s.rpc("create_event", {
    p_club_id: p.data.clubId,
    p_type: p.data.type,
    p_name: p.data.name,
    p_venue: p.data.venue,
    p_map_url: p.data.mapUrl || null,
    p_notes: p.data.notes || null,
    p_starts_at: p.data.startsAt,
    p_ends_at: p.data.endsAt,
    p_capacity: p.data.capacity,
    p_court_count: p.data.courtCount,
    p_formats: p.data.formats,
    p_record_class: p.data.recordClass,
    p_initial_status: p.data.initialStatus,
    p_is_private: p.data.isPrivate,
    p_access_code: p.data.accessCode,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error) return failure("FORBIDDEN", "Unable to create event.", requestId);
  let importedRosterCount = 0;
  let importWarning: string | null = null;
  if (imported?.success && imported.data.entries.length) {
    const { data: count, error: importError } = await s.rpc(
      "stage_external_event_roster",
      {
        p_event_id: data,
        p_source_url: imported.data.sourceUrl,
        p_entries: imported.data.entries,
        p_idempotency_key: crypto.randomUUID(),
      },
    );
    if (importError)
      importWarning =
        "The event was created, but its imported roster could not be staged.";
    else importedRosterCount = count;
  }
  revalidatePath("/dashboard/clubs");
  return success(
    { eventId: data, importedRosterCount, importWarning },
    requestId,
  );
}
export async function updateEventDetails(input: unknown) {
  const requestId = crypto.randomUUID();
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_FAILED",
      "Check the event details and schedule.",
      requestId,
      parsed.error.flatten().fieldErrors,
    );
  const s = await createClient();
  const { data, error } = await s.rpc("update_event_details", {
    p_event_id: parsed.data.eventId,
    p_expected_version: parsed.data.expectedVersion,
    p_name: parsed.data.name,
    p_venue: parsed.data.venue,
    p_map_url: parsed.data.mapUrl || null,
    p_notes: parsed.data.notes || null,
    p_starts_at: parsed.data.startsAt,
    p_ends_at: parsed.data.endsAt,
    p_capacity: parsed.data.capacity,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error)
    return failure(
      "STALE_VERSION",
      "The event changed. Refresh and try again.",
      requestId,
    );
  revalidatePath(
    `/dashboard/clubs/${parsed.data.clubSlug}/events/${parsed.data.eventId}`,
  );
  revalidatePath("/join/[eventCode]", "page");
  revalidatePath("/dashboard");
  return success({ version: Number(data) }, requestId);
}
export async function transitionEvent(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = eventTransitionSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Invalid transition.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("transition_event", {
    p_event_id: p.data.eventId,
    p_expected_version: p.data.expectedVersion,
    p_transition: p.data.transition,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error)
    return failure(
      "STALE_VERSION",
      error.details === "ACTIVE_MATCHES_REMAIN"
        ? "Finish all active matches and submit their scores before ending this event."
        : "Event changed; refresh and retry.",
      requestId,
    );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clubs/[clubSlug]/events/[eventId]", "layout");
  revalidatePath(`/dashboard/clubs/${p.data.clubId}/events/${p.data.eventId}`);
  return success({ version: Number(data) }, requestId);
}
export async function registerForEvent(input: unknown) {
  const requestId = crypto.randomUUID();
  const p = registrationSchema.safeParse(input);
  if (!p.success)
    return failure("VALIDATION_FAILED", "Accept the terms to join.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("register_for_event", {
    p_event_id: p.data.eventId,
    p_terms_version: p.data.termsVersion,
    p_access_code: p.data.accessCode ?? null,
    p_idempotency_key: p.data.idempotencyKey,
  });
  if (error) {
    const databaseMessage = `${error.message} ${error.details ?? ""}`;
    const knownMessage = databaseMessage.includes("ACCESS_CODE_REQUIRED")
      ? "Enter the correct event passcode, or accept the club invitation."
      : databaseMessage.includes("PLAYER_NOT_VERIFIED")
        ? "Verify your account before joining an event."
        : databaseMessage.includes("ALREADY_REGISTERED")
          ? "You are already registered for this event."
          : databaseMessage.includes("EVENT_NOT_OPEN")
            ? "This event is not currently open for registration."
            : "Unable to join this event. Please try again.";
    return failure("INELIGIBLE", knownMessage, requestId);
  }
  return success(data?.[0] ?? null, requestId);
}
export async function withdrawFromEvent(eventId: string) {
  const requestId = crypto.randomUUID();
  const s = await createClient();
  const { data, error } = await s.rpc("withdraw_from_event", {
    p_event_id: eventId,
    p_reason: "player_request",
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error)
    return failure("NOT_FOUND", "No active registration found.", requestId);
  return success({ registrationId: data }, requestId);
}
