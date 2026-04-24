/**
 * Safely extract a human-readable message from an unknown error value.
 *
 * `catch (error)` blocks receive `unknown` under TypeScript's strict settings,
 * so `error.message` is never safe to access without a guard. Use this helper
 * everywhere instead of touching `.message` directly.
 */
export function safeErrorMessage(error: unknown, fallback = "Unknown error"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  if (error === null || error === undefined) return fallback;
  try {
    return String(error);
  } catch {
    return fallback;
  }
}
