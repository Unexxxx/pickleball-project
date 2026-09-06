"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleAuthButton({ next = "/dashboard" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="oauth-block">
      <button
        type="button"
        className="google-auth-button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage("");
          const redirectTo = new URL("/auth/callback", window.location.origin);
          redirectTo.searchParams.set("next", next);
          const supabase = createClient();
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: redirectTo.toString(),
              queryParams: { prompt: "select_account" },
            },
          });
          if (error) {
            setPending(false);
            setMessage(
              "Google sign-in is unavailable. Check the Supabase Google provider settings.",
            );
          }
        }}
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {message ? <p role="alert">{message}</p> : null}
      <div className="auth-divider" aria-hidden="true">
        <span>or continue with email</span>
      </div>
    </div>
  );
}
