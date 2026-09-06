import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const reportSchema = z
  .object({
    subjectType: z.enum(["player", "club", "match", "content"]),
    subjectId: uuidSchema,
    reasonCode: z.string().min(2).max(50),
    description: z.string().min(10).max(2000),
    evidenceObjectIds: z.array(uuidSchema).max(10).default([]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
