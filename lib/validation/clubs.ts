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
export const clubContactSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    contact: z.string().max(200),
  })
  .strict();
export const clubMediaSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    kind: z.enum(["profile", "background"]),
    path: z.string().min(1).max(200).nullable(),
  })
  .strict();
export const clubTargetSchema = z
  .object({ clubId: uuidSchema, clubSlug: z.string().min(1).max(120) })
  .strict();
export const membershipReviewSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    membershipId: uuidSchema,
    approve: z.boolean(),
  })
  .strict();
export const membershipRemoveSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    membershipId: uuidSchema,
  })
  .strict();
export const joinPolicySchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    policy: z.enum(["open", "approval"]),
  })
  .strict();
