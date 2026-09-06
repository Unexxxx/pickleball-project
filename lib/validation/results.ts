import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
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
  .strict()
  .refine(
    (score) => score.games.every((game) => game.sideA !== game.sideB),
    "Games cannot be tied",
  );
export const submitMatchResultSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    matchId: uuidSchema,
    score: scoreSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const endMatchWithScoreSchema = z
  .object({
    clubSlug: z.string().trim().min(1).max(80),
    eventId: uuidSchema,
    matchId: uuidSchema,
    score: scoreSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const confirmMatchResultSchema = z
  .object({
    clubId: uuidSchema,
    eventId: uuidSchema,
    resultId: uuidSchema,
    revisionId: uuidSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
