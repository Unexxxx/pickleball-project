"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <p>Your data is safe. Try the request again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
