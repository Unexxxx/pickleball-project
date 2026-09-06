"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="grid max-w-md gap-4">
      <input type="hidden" name="next" value={next} />
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
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className="block w-full border p-3"
        />
      </label>
      {state && !state.ok ? <p role="alert">{state.error.message}</p> : null}
      <button disabled={pending} className="bg-emerald-700 p-3 text-white">
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
