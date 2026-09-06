"use client";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <label>
        Email
        <input
          name="email"
          type="email"
          required
          className="block w-full border p-3"
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="block w-full border p-3"
        />
      </label>
      <label>
        Display name
        <input
          name="displayName"
          required
          className="block w-full border p-3"
        />
      </label>
      <label>
        Public profile name
        <input name="publicSlug" required className="block w-full border p-3" />
      </label>
      <input type="hidden" name="termsVersion" value="2026-09-01" />
      {state && !state.ok ? <p role="alert">{state.error.message}</p> : null}
      {state?.ok ? (
        <p role="status">Check your inbox to verify your account.</p>
      ) : null}
      <button disabled={pending} className="bg-emerald-700 p-3 text-white">
        Create account
      </button>
    </form>
  );
}
