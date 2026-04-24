/**
 * Pure helpers shared by every "resend confirmation email" flow
 * (candidate / employer / freelancer logins + signup).
 *
 * Extracted into their own module so they can be unit-tested without
 * mounting a React tree or stubbing Supabase. Keeping these as pure
 * functions also guarantees the same rate-limit detection / parsing
 * behaviour across every page that imports them.
 */

/**
 * True when the Supabase auth error represents an email-not-confirmed
 * condition. Covers both the structured `code` field and the various
 * human-readable message shapes Supabase has shipped over time.
 */
export const isEmailNotConfirmedErr = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  return (
    code === "email_not_confirmed" ||
    code === "email_address_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email address not confirmed") ||
    msg.includes("confirm your email") ||
    msg.includes("not confirmed")
  );
};

/**
 * True when the error is an upstream email-send rate limit. Recognises:
 *   - HTTP 429
 *   - structured codes: `over_email_send_rate_limit`, `*rate_limit*`
 *   - legacy messages: "for security purposes ... only request this after Ns",
 *     "rate limit", "only request this after"
 *
 * IMPORTANT: must return `false` for unrelated errors (invalid creds,
 * network failures, validation errors). The cooldown UI relies on this
 * to avoid arming a timer when the user could simply retry immediately.
 */
export const isRateLimitErr = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  const status = err.status;
  return (
    status === 429 ||
    code.includes("over_email_send_rate") ||
    code.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("for security purposes") ||
    msg.includes("only request this after")
  );
};

/**
 * Pull a retry-after value (seconds) out of a Supabase rate-limit error
 * message. Falls back to 60s when nothing parseable is present, and is
 * capped at 600s so a malformed upstream value can never lock the UI for
 * an absurd window.
 */
export const getRetryAfterSeconds = (err: any): number => {
  const msg = err?.message || "";
  const match =
    msg.match(/after\s+(\d+)\s*seconds?/i) ||
    msg.match(/in\s+(\d+)\s*seconds?/i) ||
    msg.match(/(\d+)\s*seconds?/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!Number.isNaN(n) && n > 0) return Math.min(n, 600);
  }
  return 60;
};

/** Human-friendly formatter for cooldown countdown copy. */
export const formatRetryWindow = (seconds: number): string => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
};

/** Default local cooldown applied after a *successful* resend (matches the
 *  Supabase default email-send window). Centralised here so every flow
 *  re-arms the timer with the same value. */
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Pure decision function used by every "resend confirmation email"
 * handler to figure out the next cooldown value after an attempt.
 *
 * Inputs:
 *   - `error`: the Supabase response error (or null on success)
 *
 * Returns one of:
 *   - { kind: "success", cooldown: 60 } — arm the default cooldown
 *   - { kind: "rate_limited", cooldown: N } — arm the parsed retry window
 *   - { kind: "other_error", cooldown: 0 } — DO NOT touch the cooldown
 *
 * The `other_error` branch is the contract under test: a non-rate-limit
 * failure (invalid email, network, unknown) must never start a timer
 * — otherwise users would be locked out of retrying after a transient
 * error that has nothing to do with throttling.
 */
export type ResendOutcome =
  | { kind: "success"; cooldown: number }
  | { kind: "rate_limited"; cooldown: number }
  | { kind: "other_error"; cooldown: 0 };

export const decideResendOutcome = (error: any): ResendOutcome => {
  if (!error) {
    return { kind: "success", cooldown: DEFAULT_RESEND_COOLDOWN_SECONDS };
  }
  if (isRateLimitErr(error)) {
    return { kind: "rate_limited", cooldown: getRetryAfterSeconds(error) };
  }
  return { kind: "other_error", cooldown: 0 };
};
