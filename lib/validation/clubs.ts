import { z } from "zod";
import { idempotencyKeySchema, uuidSchema } from "@/lib/validation/common";
export const clubRoleSchema = z.enum([
  "owner",
  "organizer",
  "score_official",
  "staff",
  "member",
]);
export const clubSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    timezone: z.string().min(1).max(64),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const membershipRoleSchema = z
  .object({
    clubId: uuidSchema,
    membershipId: uuidSchema,
    role: clubRoleSchema,
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();
export const subscriptionWebhookSchema = z
  .object({
    eventId: z.string().min(1),
    clubId: uuidSchema,
    status: z.enum(["trialing", "active", "past_due", "canceled", "expired"]),
    occurredAt: z.iso.datetime(),
  })
  .strict();
