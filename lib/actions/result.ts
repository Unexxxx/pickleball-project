import type { CommandErrorCode } from "@/lib/domain/errors";

export type CommandResult<T> =
  | { ok: true; data: T; requestId: string; version?: number }
  | {
      ok: false;
      error: {
        code: CommandErrorCode;
        message: string;
        fields?: Record<string, string[]>;
        retryable: boolean;
      };
      requestId: string;
    };
export const success = <T>(
  data: T,
  requestId: string,
  version?: number,
): CommandResult<T> =>
  version === undefined
    ? { ok: true, data, requestId }
    : { ok: true, data, requestId, version };
export const failure = (
  code: CommandErrorCode,
  message: string,
  requestId: string,
  fields?: Record<string, string[]>,
): CommandResult<never> => ({
  ok: false,
  error: {
    code,
    message,
    ...(fields ? { fields } : {}),
    retryable:
      code === "STALE_VERSION" ||
      code === "RATE_LIMITED" ||
      code === "INTERNAL_ERROR",
  },
  requestId,
});
