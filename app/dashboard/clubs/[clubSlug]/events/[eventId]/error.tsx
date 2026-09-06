"use client";
import { useEffect, useState } from "react";
export default function EventError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener("online", update);
    addEventListener("offline", update);
    return () => {
      removeEventListener("online", update);
      removeEventListener("offline", update);
    };
  }, []);
  return (
    <main role="alert" className="p-4">
      <h1>{online ? "Event temporarily unavailable" : "You are offline"}</h1>
      <p>
        {online
          ? "Your saved competition data is safe. Retry the latest view."
          : "The displayed event state may be stale. Reconnect before submitting changes."}
      </p>
      <button onClick={retry}>Try again</button>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
    </main>
  );
}
