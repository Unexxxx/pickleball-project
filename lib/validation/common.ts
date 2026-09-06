import { z } from "zod";
export const uuidSchema = z.uuid();
export const idempotencyKeySchema = z.uuid();
export const paginationSchema = z
  .object({
    cursor: z.string().max(512).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export const scoreSchema = z
  .object({
    games: z
      .array(
        z
          .object({
            sideA: z.number().int().min(0).max(99),
            sideB: z.number().int().min(0).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict();
