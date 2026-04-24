import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_RESEND_COOLDOWN_SECONDS,
  decideResendOutcome,
  formatRetryWindow,
  type ResendOutcome,
} from "@/lib/auth/resendCooldown";

/**
 * Single shared hook used by every login / signup flow that needs to send
 * (or re-send) a Supabase confirmation email.
 *
 * Why this exists:
 *   - The candidate login, candidate signup, employer signup, and freelancer
 *     login screens all need IDENTICAL behaviour for cooldown timers, rate
 *     limit detection, friendly retry messaging, and toast copy.
 *   - Previously each screen reimplemented the same logic (some inline, some
 *     via local helpers), which drifted over time.
 *   - This hook is the single source of truth: it owns the cooldown state,
 *     the 1s ticker, and the call into `supabase.auth.resend`. Pages just
 *     render the button + a per-flow recovery card.
 *
 * The pure decision logic still lives in `src/lib/auth/resendCooldown.ts`
 * and is unit-tested there — this hook is intentionally a thin wrapper so
 * the contract under test is the same one running in production.
 */

export type ResendType = "signup" | "email_change";

export interface UseResendConfirmationOptions {
  /** Logical name of the calling flow — used for console.warn tagging only. */
  flow: string;
  /**
   * URL Supabase should send the user to after they click the verification
   * link. Defaults to the current `window.location.origin` so the user
   * lands back on the same domain.
   */
  redirectTo?: string;
  /** Resend type — defaults to `signup`. */
  type?: ResendType;
  /** Toast title used on success. */
  successTitle?: string;
  /** Builds the toast description used on success (defaults to inbox copy). */
  successDescription?: (email: string) => string;
}

export interface UseResendConfirmationReturn {
  /** Address awaiting verification (set by `setUnverifiedEmail`). */
  unverifiedEmail: string | null;
  /** Setter for the unverified email shown in the recovery panel. */
  setUnverifiedEmail: (email: string | null) => void;
  /** Seconds remaining until another resend is allowed. */
  resendCooldown: number;
  /** True while the resend network call is in flight. */
  isResending: boolean;
  /** Convenience: true when the resend button should be disabled. */
  isDisabled: boolean;
  /** Pretty countdown copy (e.g. "2 minutes"). */
  cooldownLabel: string;
  /**
   * Trigger a resend. Honours the local cooldown (no-op if still ticking).
   * `targetEmail` overrides the stored `unverifiedEmail` for one-shot calls.
   * Returns the decided outcome so callers can branch further if needed.
   */
  resend: (targetEmail?: string) => Promise<ResendOutcome | null>;
  /**
   * Manually arm the cooldown using a Supabase error returned from a flow
   * other than the resend endpoint (e.g. the initial signup call). Skips
   * toasts — caller already showed its own — and only ever sets the timer
   * for genuine rate-limit errors, never for unrelated failures.
   */
  applyExternalError: (error: any) => ResendOutcome;
  /** Reset the cooldown + unverified email (e.g. on a fresh login attempt). */
  reset: () => void;
}

export function useResendConfirmation(
  options: UseResendConfirmationOptions,
): UseResendConfirmationReturn {
  const {
    flow,
    redirectTo,
    type = "signup",
    successTitle = "Resent successfully",
    successDescription = (email) =>
      `Check your inbox at ${email} for the confirmation link.`,
  } = options;

  const { toast } = useToast();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Keep latest values in refs so the resend callback never goes stale even
  // if the consumer forgot to depend on them — important when the button is
  // wired up inside a memoised parent.
  const cooldownRef = useRef(resendCooldown);
  cooldownRef.current = resendCooldown;
  const resendingRef = useRef(isResending);
  resendingRef.current = isResending;

  // 1-second tick — drives the live countdown shown next to the button.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const reset = useCallback(() => {
    setUnverifiedEmail(null);
    setResendCooldown(0);
  }, []);

  const applyExternalError = useCallback(
    (error: any): ResendOutcome => {
      const outcome = decideResendOutcome(error);
      // Only rate-limit outcomes ever touch the cooldown — see the contract
      // documented (and unit-tested) in `decideResendOutcome`.
      if (outcome.kind === "rate_limited") {
        console.warn(`[${flow}] external rate limit`, {
          retryAfter: outcome.cooldown,
          raw: error?.message,
        });
        setResendCooldown(outcome.cooldown);
      }
      return outcome;
    },
    [flow],
  );

  const resend = useCallback(
    async (targetEmail?: string): Promise<ResendOutcome | null> => {
      const email = targetEmail ?? unverifiedEmail;
      if (!email) return null;
      if (cooldownRef.current > 0 || resendingRef.current) return null;

      setIsResending(true);
      try {
        const finalRedirect =
          redirectTo ?? (typeof window !== "undefined" ? window.location.origin : "");
        const { error } = await supabase.auth.resend({
          type,
          email,
          options: { emailRedirectTo: finalRedirect },
        });

        // Single decision point — pure, unit-tested. Guarantees that
        // non-rate-limit errors NEVER arm the cooldown timer, and that a
        // successful resend resets it to the default 60s window.
        const outcome = decideResendOutcome(error);

        if (outcome.kind === "rate_limited") {
          console.warn(`[${flow}] resend rate limit`, {
            email,
            retryAfter: outcome.cooldown,
            raw: error?.message,
          });
          setResendCooldown(outcome.cooldown);
          toast({
            title: "Please wait a moment",
            description: `Too many requests for this email. Try again in ${formatRetryWindow(outcome.cooldown)}.`,
            variant: "destructive",
          });
          return outcome;
        }

        if (outcome.kind === "other_error") {
          // Cooldown intentionally untouched — user can retry immediately
          // after a transient or non-throttling failure.
          toast({
            title: "Could not resend email",
            description: error?.message || "Please try again.",
            variant: "destructive",
          });
          return outcome;
        }

        // success — arm the default cooldown
        setResendCooldown(outcome.cooldown);
        toast({
          title: successTitle,
          description: successDescription(email),
        });
        return outcome;
      } catch (err: any) {
        // Same decision function for thrown errors (e.g. fetch failures).
        const outcome = decideResendOutcome(err);
        if (outcome.kind === "rate_limited") {
          setResendCooldown(outcome.cooldown);
          toast({
            title: "Please wait a moment",
            description: `Too many requests for this email. Try again in ${formatRetryWindow(outcome.cooldown)}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Could not resend email",
            description: err?.message || "Please try again.",
            variant: "destructive",
          });
        }
        return outcome;
      } finally {
        setIsResending(false);
      }
    },
    [unverifiedEmail, redirectTo, type, flow, toast, successTitle, successDescription],
  );

  return {
    unverifiedEmail,
    setUnverifiedEmail,
    resendCooldown,
    isResending,
    isDisabled: resendCooldown > 0 || isResending,
    cooldownLabel: formatRetryWindow(resendCooldown),
    resend,
    applyExternalError,
    reset,
  };
}

// Re-export the default so callers don't need to know the underlying constant.
export { DEFAULT_RESEND_COOLDOWN_SECONDS };
