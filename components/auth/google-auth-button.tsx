"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

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
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {message ? <p role="alert">{message}</p> : null}
      <div className="auth-divider" aria-hidden="true">
        <span>or continue with email</span>
      </div>
    </div>
  );
}
