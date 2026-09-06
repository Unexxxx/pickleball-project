export default function Loading() {
  return (
    <main className="space-y-4 p-4" aria-busy="true" aria-live="polite">
      <h1>Loading event</h1>
      <p>Preparing mobile registration and check-in controls…</p>
      <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
    </main>
  );
}
