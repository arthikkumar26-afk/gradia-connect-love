import { useEffect, useRef, useState } from "react";

/**
 * Visually-hidden ARIA live region that announces inline form validation
 * errors after each submit attempt.
 *
 * Why a dedicated announcer?
 *  - Inline `<p className="text-destructive">` error labels are visible but
 *    not reliably announced by screen readers when they are just *re-shown*
 *    or unchanged between submits. Wrapping them in a single `aria-live`
 *    region per form gives a deterministic announcement on every submit.
 *  - We re-announce even when the error set is identical between submits by
 *    keying off `submitCount`, so users who tap "Submit" repeatedly with the
 *    same problems still hear the message.
 *
 * Behaviour:
 *  - Renders nothing when there are no errors.
 *  - When `errors` becomes non-empty (or `submitCount` increases), the inner
 *    text is briefly cleared then set, which forces assistive tech to
 *    re-announce the content.
 */
interface FormErrorAnnouncerProps {
  /** Map of fieldName → error message. Falsy / non-string values are ignored.
   *  Typed loosely so it accepts both `Record<string,string>` and interfaces
   *  with optional string fields (e.g. `{ email?: string }`). */
  errors: Record<string, unknown> | object;
  /** Optional prefix, e.g. "Please fix the following before continuing:". */
  prefix?: string;
  /** Optional id so inputs can `aria-describedby` it as a fallback. */
  id?: string;
}

export const FormErrorAnnouncer = ({
  errors,
  submitCount,
  prefix = "Please fix the following error",
  id,
}: FormErrorAnnouncerProps) => {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const list = Object.values(errors).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );

    if (list.length === 0) {
      setMessage("");
      return;
    }

    // Clear first, then set on the next tick so SR announces even when the
    // text content matches the previous announcement (e.g., user resubmits
    // without fixing anything).
    setMessage("");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const heading = list.length === 1 ? `${prefix}:` : `${prefix}s (${list.length}):`;
      setMessage(`${heading} ${list.join(". ")}`);
    }, 50);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
    // submitCount is intentionally part of the dep list so that re-submitting
    // with an unchanged error set still triggers the announcement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors, submitCount, prefix]);

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

export default FormErrorAnnouncer;
