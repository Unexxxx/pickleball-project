import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const openDisputeSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    resultId: uuidSchema,
    reasonCode: z.string().min(2).max(50),
    description: z.string().min(10).max(2000),
    evidenceObjectIds: z.array(uuidSchema).max(10).default([]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const resolveDisputeSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    disputeId: uuidSchema,
    resolution: z.enum(["upheld", "corrected", "voided"]),
    correctedScore: z.unknown().optional(),
    reason: z.string().min(10).max(2000),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (v) => v.resolution !== "corrected" || v.correctedScore !== undefined,
    "Corrected score required",
  );
