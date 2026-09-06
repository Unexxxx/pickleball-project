import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  INTERNAL_SCHEDULER_SECRET: z.string().min(20),
  SUBSCRIPTION_WEBHOOK_SECRET: z.string().min(20),
});
export const parsePublicEnv = (input: unknown) => publicSchema.parse(input);
export const parseServerEnv = (input: unknown) => {
  const env = serverSchema.parse(input);
  if (
    process.env.NODE_ENV === "production" &&
    new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname === "127.0.0.1"
  )
    throw new Error("Production cannot use a local Supabase URL");
  if (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error("Service-role key cannot be public");
  return env;
};
