import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requested = (await searchParams).next;
  const next =
    requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1>Create your player account</h1>
      <p>Use Google for the fastest setup, or create an account with email.</p>
      <GoogleAuthButton next={next} />
      <RegisterForm />
      <div className="mt-4 flex gap-4">
        <Link href="/login">Log in</Link>
        <Link href="/recover">Recover account</Link>
      </div>
    </main>
  );
}
