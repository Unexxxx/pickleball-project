import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const reviewReportSchema = z
  .object({
    reportId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    decision: z.enum(["reviewing", "actioned", "dismissed", "reopened"]),
    reason: z.string().min(5).max(1000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const moderationActionSchema = z
  .object({
    reportId: uuidSchema.nullable(),
    subjectType: z.enum(["player", "club", "content"]),
    subjectId: uuidSchema,
    action: z.string().min(2).max(50),
    reason: z.string().min(10).max(1000),
    expiresAt: z.iso.datetime().nullable(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const duplicateMergeSchema = z
  .object({
    reviewId: uuidSchema,
    survivingPlayerId: uuidSchema,
    reason: z.string().min(10).max(1000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
