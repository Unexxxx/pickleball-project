"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const [reveal, setReveal] = useState(false);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>
      <label>
        Password
        <span className="auth-field">
          <input
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            minLength={8}
            required
          />
          <button
            type="button"
            className="auth-reveal-toggle"
            aria-pressed={reveal}
            onClick={() => setReveal((value) => !value)}
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {state && !state.ok ? (
        <p role="alert" className="auth-error">
          {state.error.message}
        </p>
      ) : null}
      <button disabled={pending} className="auth-submit" data-pending={pending}>
        {pending ? (
          <>
            <span className="auth-spinner" aria-hidden="true" /> Logging in…
          </>
        ) : (
          "Log in"
        )}
      </button>
    </form>
  );
}
