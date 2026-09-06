import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";

export const assignNextQueuedMatchSchema = z
  .object({
    clubSlug: z.string().trim().min(1).max(80),
    eventId: uuidSchema,
    format: z.enum(["singles", "doubles"]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const cancelMatchAssignmentSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    matchId: uuidSchema,
    reason: z.string().trim().min(3).max(300),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
