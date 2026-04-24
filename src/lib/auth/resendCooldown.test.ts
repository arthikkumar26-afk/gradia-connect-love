import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isRateLimitErr,
  isEmailNotConfirmedErr,
  getRetryAfterSeconds,
  formatRetryWindow,
  decideResendOutcome,
  DEFAULT_RESEND_COOLDOWN_SECONDS,
} from "./resendCooldown";

describe("isRateLimitErr", () => {
  it("detects HTTP 429 status", () => {
    expect(isRateLimitErr({ status: 429, message: "Too many requests" })).toBe(true);
  });

  it("detects structured rate-limit codes", () => {
    expect(isRateLimitErr({ code: "over_email_send_rate_limit" })).toBe(true);
    expect(isRateLimitErr({ code: "rate_limit_exceeded" })).toBe(true);
  });

  it("detects legacy 'for security purposes' message", () => {
    expect(
      isRateLimitErr({
        message: "For security purposes, you can only request this after 30 seconds.",
      })
    ).toBe(true);
  });

  it("does NOT trigger on unrelated errors (the contract under test)", () => {
    // These are the failure modes that previously could have armed the
    // cooldown by accident — every one must return false.
    expect(isRateLimitErr(null)).toBe(false);
    expect(isRateLimitErr(undefined)).toBe(false);
    expect(isRateLimitErr({ message: "Invalid login credentials" })).toBe(false);
    expect(isRateLimitErr({ message: "User not found" })).toBe(false);
    expect(isRateLimitErr({ message: "Failed to fetch" })).toBe(false);
    expect(isRateLimitErr({ message: "NetworkError when attempting to fetch" })).toBe(false);
    expect(isRateLimitErr({ message: "Email not confirmed" })).toBe(false);
    expect(isRateLimitErr({ status: 500, message: "Internal server error" })).toBe(false);
    expect(isRateLimitErr({ status: 400, code: "validation_failed" })).toBe(false);
  });
});

describe("isEmailNotConfirmedErr", () => {
  it("detects structured code variants", () => {
    expect(isEmailNotConfirmedErr({ code: "email_not_confirmed" })).toBe(true);
    expect(isEmailNotConfirmedErr({ code: "email_address_not_confirmed" })).toBe(true);
  });

  it("detects message variants", () => {
    expect(isEmailNotConfirmedErr({ message: "Email not confirmed" })).toBe(true);
    expect(isEmailNotConfirmedErr({ message: "Please confirm your email" })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isEmailNotConfirmedErr(null)).toBe(false);
    expect(isEmailNotConfirmedErr({ message: "Invalid login credentials" })).toBe(false);
    expect(isEmailNotConfirmedErr({ status: 429 })).toBe(false);
  });
});

describe("getRetryAfterSeconds", () => {
  it("parses 'after N seconds'", () => {
    expect(getRetryAfterSeconds({ message: "try again after 45 seconds" })).toBe(45);
  });

  it("parses 'in N seconds'", () => {
    expect(getRetryAfterSeconds({ message: "retry in 12 seconds" })).toBe(12);
  });

  it("parses bare 'N seconds'", () => {
    expect(getRetryAfterSeconds({ message: "30 seconds" })).toBe(30);
  });

  it("falls back to 60s when nothing parseable", () => {
    expect(getRetryAfterSeconds({ message: "rate limit hit" })).toBe(60);
    expect(getRetryAfterSeconds({})).toBe(60);
    expect(getRetryAfterSeconds(null)).toBe(60);
  });

  it("caps at 600s (10 minutes) to prevent UI lockout", () => {
    expect(getRetryAfterSeconds({ message: "after 99999 seconds" })).toBe(600);
  });
});

describe("formatRetryWindow", () => {
  it("uses seconds under 60", () => {
    expect(formatRetryWindow(1)).toBe("1 second");
    expect(formatRetryWindow(45)).toBe("45 seconds");
  });

  it("rounds up to whole minutes at/above 60s", () => {
    expect(formatRetryWindow(60)).toBe("1 minute");
    expect(formatRetryWindow(90)).toBe("2 minutes");
    expect(formatRetryWindow(180)).toBe("3 minutes");
  });
});

describe("decideResendOutcome", () => {
  it("returns success+default cooldown when there is no error", () => {
    const outcome = decideResendOutcome(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.cooldown).toBe(DEFAULT_RESEND_COOLDOWN_SECONDS);
  });

  it("returns rate_limited with parsed window for 429-style errors", () => {
    const outcome = decideResendOutcome({
      status: 429,
      message: "For security purposes, you can only request this after 23 seconds.",
    });
    expect(outcome.kind).toBe("rate_limited");
    expect(outcome.cooldown).toBe(23);
  });

  it("returns other_error with cooldown=0 for non-rate-limit failures", () => {
    // The critical guarantee: these must NOT arm the cooldown timer.
    const cases = [
      { message: "Invalid login credentials" },
      { message: "Email not confirmed" },
      { message: "Failed to fetch" },
      { status: 500, message: "Internal server error" },
      { status: 400, code: "validation_failed" },
    ];
    for (const err of cases) {
      const outcome = decideResendOutcome(err);
      expect(outcome.kind).toBe("other_error");
      expect(outcome.cooldown).toBe(0);
    }
  });
});

/**
 * Integration-style tests for the cooldown timer behavior. We model the
 * exact useEffect tick used by CandidateLogin.tsx (1s interval, decrement
 * by 1, stop at 0) and verify:
 *   1. A successful resend arms the timer at 60s and it ticks down to 0.
 *   2. Other-errors leave the timer untouched.
 *   3. Rate-limited responses re-arm the timer with the parsed value.
 */
describe("cooldown timer behavior (integration)", () => {
  let cooldown = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Mirror of the useEffect tick in CandidateLogin: decrements every
  // second, clears itself at 0. Returns the cleanup fn for parity.
  const startTick = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      cooldown = cooldown > 0 ? cooldown - 1 : 0;
      if (cooldown === 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 1000);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    cooldown = 0;
    intervalId = null;
  });

  afterEach(() => {
    if (intervalId) clearInterval(intervalId);
    vi.useRealTimers();
  });

  it("successful resend arms 60s cooldown and ticks down to 0", () => {
    const outcome = decideResendOutcome(null); // success
    cooldown = outcome.cooldown;
    startTick();

    expect(cooldown).toBe(60);

    // Tick 30 seconds — halfway through.
    vi.advanceTimersByTime(30_000);
    expect(cooldown).toBe(30);

    // Tick the remaining 30s — must reset to 0 (timer "resets" / clears).
    vi.advanceTimersByTime(30_000);
    expect(cooldown).toBe(0);
  });

  it("non-rate-limit errors do NOT start the cooldown", () => {
    const errors = [
      { message: "Invalid login credentials" },
      { message: "Failed to fetch" },
      { status: 500, message: "Internal server error" },
    ];

    for (const err of errors) {
      cooldown = 0;
      const outcome = decideResendOutcome(err);

      // Contract: cooldown stays 0, timer is never armed.
      expect(outcome.kind).toBe("other_error");
      if (outcome.cooldown > 0) {
        cooldown = outcome.cooldown;
        startTick();
      }
      vi.advanceTimersByTime(5_000);
      expect(cooldown).toBe(0);
    }
  });

  it("rate-limited response re-arms the timer with the parsed window", () => {
    const outcome = decideResendOutcome({
      status: 429,
      message: "For security purposes, you can only request this after 15 seconds.",
    });
    cooldown = outcome.cooldown;
    startTick();

    expect(cooldown).toBe(15);
    vi.advanceTimersByTime(15_000);
    expect(cooldown).toBe(0);
  });

  it("a successful retry after a prior cooldown resets the timer to 60s", () => {
    // First attempt: rate-limited, arms 10s.
    cooldown = decideResendOutcome({ status: 429, message: "after 10 seconds" }).cooldown;
    startTick();
    expect(cooldown).toBe(10);

    // Wait it out.
    vi.advanceTimersByTime(10_000);
    expect(cooldown).toBe(0);

    // Second attempt succeeds — must reset to the default 60s window.
    cooldown = decideResendOutcome(null).cooldown;
    startTick();
    expect(cooldown).toBe(60);

    vi.advanceTimersByTime(60_000);
    expect(cooldown).toBe(0);
  });
});
