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
    <main className="auth-main">
      <p className="auth-kicker">Welcome back</p>
      <h1>Log in to UNEX</h1>
      <p className="auth-sub">Find your next match and follow your progress.</p>
      <GoogleAuthButton next={next} />
      <LoginForm next={next} />
      <div className="auth-links">
        <Link href="/recover">Forgot password?</Link>
        <Link href="/register">Create account</Link>
      </div>
    </main>
  );
}
