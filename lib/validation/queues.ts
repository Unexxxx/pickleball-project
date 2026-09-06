import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const attendanceSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    playerId: uuidSchema,
    state: z.enum(["checked_in", "checked_out"]),
    reason: z.string().trim().min(3).max(300),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const organizerCheckoutSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    playerId: uuidSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const joinQueueSchema = z
  .object({ eventId: uuidSchema, idempotencyKey: idempotencyKeySchema })
  .strict();
export const leaveQueueSchema = z
  .object({
    eventId: uuidSchema,
    reason: z.string().trim().max(300).optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const adjustQueueSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    queueEntryId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    beforeEntryId: uuidSchema.nullable(),
    reason: z.string().trim().min(3).max(300),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const replaceStandbyPlayerSchema = z
  .object({
    clubSlug: z.string().trim().min(1).max(80),
    eventId: uuidSchema,
    format: z.enum(["singles", "doubles"]),
    outgoingEntryId: uuidSchema,
    replacementEntryId: uuidSchema,
    expectedQueueVersion: z.number().int().nonnegative(),
    reason: z.string().trim().min(3).max(300),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine((value) => value.outgoingEntryId !== value.replacementEntryId, {
    message: "Choose a different replacement player.",
    path: ["replacementEntryId"],
  });
