export type TelemetryFields = Record<string, boolean | number | string | null>;

export function emitTelemetry(event: string, fields: TelemetryFields = {}) {
  console.info(
    JSON.stringify({ event, ...fields, occurredAt: new Date().toISOString() }),
  );
}

export async function observe<T>(
  event: string,
  operation: () => Promise<T>,
  fields: TelemetryFields = {},
): Promise<T> {
  const started = performance.now();
  try {
    const result = await operation();
    emitTelemetry(event, {
      ...fields,
      durationMs: Math.round(performance.now() - started),
      ok: true,
    });
    return result;
  } catch (error) {
    emitTelemetry(event, {
      ...fields,
      durationMs: Math.round(performance.now() - started),
      errorType: error instanceof Error ? error.name : "UnknownError",
      ok: false,
    });
    throw error;
  }
}
