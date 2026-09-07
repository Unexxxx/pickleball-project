"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { resendVerification } from "@/lib/actions/auth";

type VerificationError = {
  code: string;
  description: string;
};

export function VerifyStatus() {
  const [state, action, pending] = useActionState(resendVerification, null);
  const hash = useSyncExternalStore(
    () => () => undefined,
    () => window.location.hash,
    () => "",
  );
  const fragment = new URLSearchParams(hash.slice(1));
  const errorCode = fragment.get("error_code");
  const linkError: VerificationError | null = errorCode
    ? {
        code: errorCode,
        description:
          fragment.get("error_description")?.replace(/\+/g, " ") ??
          "The verification link could not be used.",
      }
    : null;

  return (
    <section aria-live="polite">
      <h1>Verify your account</h1>
      {linkError ? (
        <>
          <p role="alert">
            {linkError.code === "otp_expired"
              ? "That verification link has expired or was already opened. Request a fresh link below and use only the newest email."
              : linkError.description}
          </p>
          <form action={action} className="mt-6 grid max-w-md gap-3">
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full border p-3"
              />
            </label>
            <button
              disabled={pending}
              className="bg-emerald-700 p-3 text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send a new verification email"}
            </button>
          </form>
          {state && !state.ok ? (
            <p className="mt-3" role="alert">
              {state.error.message}
            </p>
          ) : null}
          {state?.ok ? (
            <p className="mt-3" role="status">
              A fresh verification email was sent. Check your inbox and open the
              newest message.
            </p>
          ) : null}
          <Link className="mt-4 inline-block" href="/login">
            Return to login
          </Link>
        </>
      ) : (
        <p>
          Open the secure link sent to your email before joining a match. If you
          requested more than one email, use the newest message.
        </p>
      )}
    </section>
  );
}
