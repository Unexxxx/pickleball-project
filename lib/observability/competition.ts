import { emitTelemetry, observe, type TelemetryFields } from "./app";

export async function measureCompetitionRead<T>(
  name: string,
  operation: () => Promise<T>,
) {
  const started = performance.now();
  try {
    return await operation();
  } finally {
    const durationMs = performance.now() - started;
    if (durationMs > 1000)
      console.warn(JSON.stringify({ name, durationMs, targetMs: 1000 }));
  }
}
export const isCalculationFresh = (visible: number, expected: number) =>
  visible >= expected;

export const observeCompetition = <T>(
  operation: "finalization" | "freshness" | "realtime" | "replay" | "retention",
  callback: () => Promise<T>,
  fields: TelemetryFields = {},
) => observe(`competition.${operation}`, callback, fields);

export function recordFreshness(visible: number, expected: number) {
  const fresh = isCalculationFresh(visible, expected);
  emitTelemetry("competition.freshness", { expected, fresh, visible });
  return fresh;
}
