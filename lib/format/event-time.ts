// Event dates are always shown in the club's own timezone.
export function formatEventTime(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function eventDay(iso: string, timeZone: string) {
  const date = new Date(iso);
  return {
    month: date.toLocaleString("en-US", { month: "short", timeZone }),
    day: date.toLocaleString("en-US", { day: "numeric", timeZone }),
  };
}
