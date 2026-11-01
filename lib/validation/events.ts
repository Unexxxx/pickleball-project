import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const eventSchema = z
  .object({
    clubId: uuidSchema,
    type: z.enum(["open_play", "tournament", "league", "clinic", "other"]),
    name: z.string().trim().min(3, "Enter at least 3 characters").max(120),
    venue: z.string().trim().min(2, "Enter a venue").max(200),
    mapUrl: z
      .union([z.url().max(1000), z.literal("")])
      .nullable()
      .refine((value) => !value || value.startsWith("https://"), {
        message: "Map location must use a secure HTTPS link",
      }),
    notes: z.string().trim().max(10_000).nullable(),
    startsAt: z.iso.datetime({ error: "Enter a valid start date and time" }),
    endsAt: z.iso.datetime({ error: "Enter a valid end date and time" }),
    capacity: z.coerce
      .number()
      .int()
      .min(2, "Use at least 2 players")
      .max(1000),
    courtCount: z.coerce.number().int().min(1, "Use at least 1 court").max(100),
    // An event is either singles or doubles (events_single_format).
    formats: z.array(z.enum(["singles", "doubles"])).length(1),
    recordClass: z.enum(["ranked", "unranked"]),
    initialStatus: z.enum(["draft", "published"]),
    isPrivate: z.coerce.boolean(),
    accessCode: z.string().trim().max(32).nullable(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine((v) => new Date(v.startsAt) > new Date(), {
    path: ["startsAt"],
    message: "must be in the future",
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    path: ["endsAt"],
    message: "must be after the start time",
  })
  .refine((v) => !v.isPrivate || (v.accessCode?.length ?? 0) >= 4, {
    path: ["accessCode"],
    message: "Private events need a passcode of at least 4 characters",
  });
export const externalRosterEntrySchema = z.object({
  sourceRef: z.string().min(1).max(160),
  displayName: z.string().trim().min(1).max(120),
  status: z.enum(["confirmed", "waitlisted"]),
  waitlistPosition: z.number().int().positive().nullable(),
});
export const externalEventImportSchema = z.object({
  sourceUrl: z.url().max(500),
  entries: z.array(externalRosterEntrySchema).max(500),
});
export const eventTransitionSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    transition: z.enum([
      "published",
      "registration_closed",
      "in_progress",
      "completed",
      "canceled",
    ]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const eventUpdateSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().trim().min(1).max(80),
    eventId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    name: z.string().trim().min(3).max(120),
    venue: z.string().trim().min(2).max(200),
    mapUrl: z
      .union([z.url().max(1000), z.literal("")])
      .nullable()
      .refine((value) => !value || value.startsWith("https://"), {
        message: "Map location must use a secure HTTPS link",
      }),
    notes: z.string().trim().max(10_000).nullable(),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    capacity: z.coerce.number().int().min(2).max(1000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine((value) => new Date(value.startsAt) > new Date(), {
    path: ["startsAt"],
    message: "must be in the future",
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    path: ["endsAt"],
    message: "End must be after start",
  });
export const registrationSchema = z
  .object({
    eventId: uuidSchema,
    termsVersion: z.string().min(1),
    idempotencyKey: idempotencyKeySchema,
    accessCode: z.string().trim().max(32).nullable().optional(),
  })
  .strict();
export const registrationReviewSchema = z
  .object({
    registrationId: uuidSchema,
    eventId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    approve: z.boolean(),
  })
  .strict();

/**
 * What an event template remembers: everything on Create event except the
 * date and the passcode (passcodes are only stored hashed).
 */
export const templateSettingsSchema = z
  .object({
    name: z.string().trim().max(120),
    type: z.enum(["open_play", "tournament"]),
    format: z.enum(["doubles", "singles"]),
    recordClass: z.enum(["ranked", "unranked"]),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    hours: z.number().int().min(3).max(8),
    venue: z.string().trim().max(200),
    mapUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => !value || value.startsWith("https://")),
    capacity: z.number().int().min(2).max(1000),
    courts: z.number().int().min(1).max(100),
    isPrivate: z.boolean(),
    notes: z.string().trim().max(10_000),
  })
  .strict();
export type TemplateSettings = z.infer<typeof templateSettingsSchema>;

export const templateSaveSchema = z
  .object({
    clubId: uuidSchema,
    name: z
      .string()
      .trim()
      .min(1, "Name the template")
      .max(60, "Use 60 characters or fewer"),
    settings: templateSettingsSchema,
  })
  .strict();

export const templateDeleteSchema = z
  .object({ clubId: uuidSchema, templateId: uuidSchema })
  .strict();
