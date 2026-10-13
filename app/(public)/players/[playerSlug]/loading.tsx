export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <h1>Loading player record</h1>
      <div className="h-24 animate-pulse rounded-xl bg-white/10" />
    </main>
  );
}
