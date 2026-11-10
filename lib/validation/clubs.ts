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
/** Owners make a member an admin ("organizer") or an admin a member. */
export const memberRoleChangeSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    membershipId: uuidSchema,
    role: z.enum(["organizer", "member"]),
  })
  .strict();
/** A page of a member list: search text and where the last page ended. */
export const memberPageSchema = z
  .object({
    clubId: uuidSchema,
    scope: z.enum(["members", "requests"]),
    query: z.string().max(100).default(""),
    after: z
      .object({ name: z.string().max(200), id: uuidSchema })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();
/** A page of a club leaderboard: filter, search and the last rank shown. */
export const clubBoardPageSchema = z
  .object({
    clubId: uuidSchema,
    membersOnly: z.boolean().default(false),
    query: z.string().max(100).default(""),
    afterRank: z.number().int().positive().nullable().default(null),
  })
  .strict();
/** Owners hand the club to one of its admins. */
export const ownershipTransferSchema = z
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
// Blank clears a field. The database applies the same rules.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FACEBOOK = /^(https?:\/\/)?((www|m|web)\.)?(facebook|fb)\.com\/\S+$/i;
export const clubContactsSchema = z
  .object({
    clubId: uuidSchema,
    clubSlug: z.string().min(1).max(120),
    email: z
      .string()
      .trim()
      .max(254)
      .refine(
        (v) => !v || EMAIL.test(v),
        "Enter an email like club@example.com.",
      ),
    facebook: z
      .string()
      .trim()
      .max(200)
      .refine(
        (v) => !v || FACEBOOK.test(v),
        "Use your Facebook page link, e.g. facebook.com/yourclub.",
      ),
    // Free text: any format the club wants to share.
    phone: z.string().trim().max(100, "Keep it under 100 characters."),
  })
  .strict();
