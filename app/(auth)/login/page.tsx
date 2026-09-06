import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/lib/supabase/server";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const next =
    requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1>Log in</h1>
      <p>Use your verified player account.</p>
      <GoogleAuthButton next={next} />
      <LoginForm next={next} />
      <div className="mt-4 flex gap-4">
        <Link href="/recover">Forgot password?</Link>
        <Link href="/register">Create account</Link>
      </div>
    </main>
  );
}
