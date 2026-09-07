import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
const prohibited = /^(guest|ghost|anonymous|anon|unknown|player\s*\d+)$/i;
const displayNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((v) => !prohibited.test(v), "Use your real player identity");

export const registrationSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(128),
    displayName: displayNameSchema,
    termsVersion: z.string().min(1),
  })
  .strict();

export function createPublicSlug(
  displayName: string,
  suffix = crypto.randomUUID(),
) {
  const base = displayName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const uniqueSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);

  return `${base || "player"}-${uniqueSuffix || "account"}`.slice(0, 40);
}

export const profileSchema = z
  .object({
    displayName: displayNameSchema,
    publicSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9-]{2,39}$/)
      .refine((v) => !prohibited.test(v), "Use your real player identity"),
    termsVersion: z.string().min(1),
  })
  .strict();
export const recoverySchema = z.object({ email: z.email() }).strict();
export const profileUpdateSchema = z
  .object({
    displayName: displayNameSchema,
    avatarPath: z
      .string()
      .regex(/^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/)
      .nullable(),
    expectedVersion: z.number().int().positive(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(128),
  })
  .strict();
export const attestationSchema = z
  .object({
    clubId: uuidSchema,
    playerId: uuidSchema,
    attestationType: z.enum(["in_person", "government_id", "club_record"]),
    note: z.string().trim().max(500).optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
