"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, success } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
const eventCourtInput = z.object({
  eventId: z.string().uuid(),
  clubSlug: z.string().min(1).max(120),
});
const reduceCourtInput = eventCourtInput.extend({ courtId: z.string().uuid() });
function refresh(clubSlug: string, eventId: string) {
  revalidatePath(`/dashboard/clubs/${clubSlug}/events/${eventId}/courts`);
  revalidatePath(`/dashboard/clubs/${clubSlug}/events/${eventId}/queue`);
  revalidatePath(`/dashboard/clubs/${clubSlug}/events/${eventId}/matches`);
}
export async function addEventCourt(input: unknown) {
  const requestId = crypto.randomUUID(),
    parsed = eventCourtInput.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Invalid event.", requestId);
  const s = await createClient();
  const { data, error } = await s.rpc("add_event_court", {
    p_event_id: parsed.data.eventId,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) {
    const details = `${error.message} ${error.details ?? ""}`;
    return failure(
      details.includes("EVENT_CLOSED") ? "CONFLICT" : "FORBIDDEN",
      details.includes("EVENT_CLOSED")
        ? "Courts cannot be changed after the event closes."
        : "The court could not be added.",
      requestId,
    );
  }
  refresh(parsed.data.clubSlug, parsed.data.eventId);
  return success(data?.[0] ?? null, requestId);
}
export async function reduceEventCourt(input: unknown) {
  const requestId = crypto.randomUUID(),
    parsed = reduceCourtInput.safeParse(input);
  if (!parsed.success)
    return failure("VALIDATION_FAILED", "Invalid court.", requestId);
  const s = await createClient();
  const { error } = await s.rpc("reduce_event_court", {
    p_event_id: parsed.data.eventId,
    p_court_id: parsed.data.courtId,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) {
    const details = `${error.message} ${error.details ?? ""}`;
    const message = details.includes("COURT_IN_USE")
      ? "Finish the active match before reducing this court."
      : details.includes("MINIMUM_COURT_COUNT")
        ? "Every event must keep at least one court."
        : details.includes("EVENT_CLOSED")
          ? "Courts cannot be changed after the event closes."
          : "The court could not be reduced.";
    return failure("CONFLICT", message, requestId);
  }
  refresh(parsed.data.clubSlug, parsed.data.eventId);
  return success({ courtId: parsed.data.courtId }, requestId);
}
