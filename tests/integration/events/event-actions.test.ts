import { describe, expect, it } from "vitest";
import {
  eventSchema,
  eventTransitionSchema,
  eventUpdateSchema,
  registrationSchema,
} from "@/lib/validation/events";
const id = crypto.randomUUID();
describe("event contracts", () => {
  it("accepts an open-play event", () =>
    expect(
      eventSchema.safeParse({
        clubId: id,
        type: "open_play",
        name: "Friday Open Play",
        venue: "Central Courts",
        mapUrl: "https://maps.google.com/?q=Central+Courts",
        notes: "Bring water.\nRespect court rotations.",
        startsAt: "2026-10-01T10:00:00.000Z",
        endsAt: "2026-10-01T12:00:00.000Z",
        capacity: 16,
        courtCount: 4,
        formats: ["doubles"],
        recordClass: "unranked",
        initialStatus: "published",
        isPrivate: false,
        accessCode: null,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true));
  it("rejects imported Reclub details when the source date is already past", () =>
    expect(
      eventSchema.safeParse({
        clubId: id,
        type: "open_play",
        name: "☀️Thursday Morning Open Play | 150",
        venue: "Home Court Pickleball",
        mapUrl: "",
        notes: "",
        startsAt: "2026-08-27T07:00:00.000Z",
        endsAt: "2026-08-27T12:00:00.000Z",
        capacity: "36",
        courtCount: "4",
        formats: ["doubles"],
        recordClass: "unranked",
        initialStatus: "published",
        isPrivate: false,
        accessCode: null,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false));
  it("rejects invalid lifecycle transitions", () =>
    expect(
      eventTransitionSchema.safeParse({
        clubId: id,
        eventId: id,
        transition: "destroy",
        expectedVersion: 1,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false));
  it("requires a usable passcode for private events", () => {
    const base = {
      clubId: id,
      type: "open_play",
      name: "Invitation Night",
      venue: "Central Courts",
      mapUrl: null,
      notes: null,
      startsAt: "2026-10-01T10:00:00.000Z",
      endsAt: "2026-10-01T12:00:00.000Z",
      capacity: 16,
      courtCount: 4,
      formats: ["doubles"],
      recordClass: "unranked",
      initialStatus: "published",
      isPrivate: true,
      idempotencyKey: crypto.randomUUID(),
    };
    expect(eventSchema.safeParse({ ...base, accessCode: "123" }).success).toBe(
      false,
    );
    expect(
      eventSchema.safeParse({ ...base, accessCode: "dink-2026" }).success,
    ).toBe(true);
  });
  it("requires accepted terms", () =>
    expect(
      registrationSchema.safeParse({
        eventId: id,
        termsVersion: "",
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(false));
  it("accepts a published event reschedule", () =>
    expect(
      eventUpdateSchema.safeParse({
        clubId: id,
        clubSlug: "central-club",
        eventId: id,
        expectedVersion: 2,
        name: "Friday Open Play",
        venue: "Central Courts",
        mapUrl: "https://maps.google.com/?q=Central+Courts",
        notes: "New schedule. Bring water.",
        startsAt: "2026-10-02T10:00:00.000Z",
        endsAt: "2026-10-02T12:00:00.000Z",
        capacity: 20,
        idempotencyKey: crypto.randomUUID(),
      }).success,
    ).toBe(true));
});
