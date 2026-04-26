import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle2, Loader2, Briefcase, User, ArrowLeft, Check, ChevronsUpDown, Mail, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateValue,
  getNextAvailableSlot,
  getTimeSlots as buildTimeSlots,
  type Granularity,
  type TimeOfDay,
} from "@/lib/scheduler/timeSlots";
import {
  assertInvitationRoute,
  assertInvitationDeliveryRoute,
  buildInvitationDeliveryInvocation,
  type InvitationFunctionName,
} from "@/lib/scheduler/invitationRoute";

// Friendly labels for the booking_type values we persist into `slot_bookings`.
// Surfaced in the rescheduling confirmation dialog so candidates can verify
// they're updating the right round before we delete their previous slot.
const BOOKING_TYPE_LABELS: Record<string, string> = {
  demo_round: "Demo Round",
  hr_round: "HR Round",
  segment_round: "Segment Round",
  admin_academic_round: "Admin & Academic Round",
  core_team_round: "Core Team Round",
  management_round: "Management Round",
  written_test: "Written Test",
  technical_assessment: "Technical Assessment",
};

const BookSlot = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const candidateId = searchParams.get("candidateId");
  const stageId = searchParams.get("stageId");
  const stageName = searchParams.get("stageName") || "Technical Assessment";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  // Tracks whether the just-completed booking replaced an earlier slot. Drives
  // the heading + copy on the confirmation screen so the candidate gets an
  // explicit "rescheduled" status step (and knows to expect a *new* invite
  // email rather than re-using the old link).
  const [wasRescheduled, setWasRescheduled] = useState(false);
  const [loading, setLoading] = useState(true);
  // Invitation delivery status shown on the confirmation screen.
  // - idle: not applicable (e.g. multi-slot stage where employer confirms first)
  // - sending: resend in flight
  // - sent: edge function returned success
  // - failed: edge function errored — user can retry
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [inviteSentAt, setInviteSentAt] = useState<Date | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  // The actual test/meeting URL pulled from `interview_invitations.meeting_link`
  // after a successful send. Surfaced inline on the confirmation screen so the
  // candidate can open the test even if the invitation email is delayed.
  const [interviewLink, setInterviewLink] = useState<string | null>(null);
  // When the inline test/meeting link stops being valid. Sourced from
  // `interview_invitations.expires_at` (set to 7 days from send by the
  // edge function). Surfaced next to the link so candidates can tell at
  // a glance whether they still have time, need to resend, or rebook.
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<{
    name: string;
    email: string;
    jobTitle: string;
    companyName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Multi-slot booking: single date + 3 preferred timings (for live meeting stages)
  const isFeedbackStage = stageName.toLowerCase().includes("feedback");
  const isDemoStage = stageName.toLowerCase().includes("demo") && !isFeedbackStage;
  const isHrStage = stageName.toLowerCase().includes("hr") && !isFeedbackStage;
  const isSegmentStage = stageName.toLowerCase().includes("segment") && !isFeedbackStage;
  const isAdminAcademicStage = stageName.toLowerCase().includes("admin") && stageName.toLowerCase().includes("academic") && !isFeedbackStage;
  const isCoreTeamStage = stageName.toLowerCase().includes("core team") && !isFeedbackStage;
  const isManagementStage = stageName.toLowerCase().includes("management") && !isFeedbackStage;
  const isMultiSlotStage = isDemoStage || isHrStage || isSegmentStage || isAdminAcademicStage || isCoreTeamStage || isManagementStage;
  const [preferredSlots, setPreferredSlots] = useState<{ date: string; time: string }[]>([]);
  const [demoDate, setDemoDate] = useState("");
  const [demoTime1, setDemoTime1] = useState("");
  const [demoTime2, setDemoTime2] = useState("");
  const [demoTime3, setDemoTime3] = useState("");

  // Existing booking detection — populated on mount so the submit button can
  // open a confirmation dialog before we delete the candidate's prior slot.
  const [existingBooking, setExistingBooking] = useState<{
    booking_date: string;
    booking_time: string;
  } | null>(null);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  // Multi-step reschedule state machine. Drives the dialog so the candidate
  // cannot dismiss / proceed until the new time is actually confirmed by the
  // backend:
  //   - idle:       dialog closed or freshly opened, awaiting confirm click
  //   - validating: re-running slot validation right before submit
  //   - submitting: booking + invitation in flight; cancel disabled
  //   - confirmed:  backend accepted; dialog auto-closes into success screen
  //   - failed:     show inline error inside the dialog, allow retry
  const [rescheduleStatus, setRescheduleStatus] = useState<
    "idle" | "validating" | "submitting" | "confirmed" | "failed"
  >("idle");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Derived booking_type matches the value persisted into `slot_bookings`. Kept
  // at the component level (rather than inside the handler) so we can:
  //   1. Pre-fetch any existing booking on mount.
  //   2. Render a friendly label in the reschedule confirmation dialog.
  const isWrittenTestSlotBooking = stageName.toLowerCase().includes("written") && !isFeedbackStage;
  const isHrSlotBooking = isHrStage;
  const isSegmentSlotBooking = isSegmentStage;
  const isAdminAcademicSlotBooking = isAdminAcademicStage;
  const isCoreTeamSlotBooking = isCoreTeamStage;
  const isManagementSlotBooking = isManagementStage;
  const bookingType = isDemoStage
    ? "demo_round"
    : isHrSlotBooking
    ? "hr_round"
    : isSegmentSlotBooking
    ? "segment_round"
    : isAdminAcademicSlotBooking
    ? "admin_academic_round"
    : isCoreTeamSlotBooking
    ? "core_team_round"
    : isManagementSlotBooking
    ? "management_round"
    : isWrittenTestSlotBooking
    ? "written_test"
    : "technical_assessment";
  const bookingTypeLabel = BOOKING_TYPE_LABELS[bookingType] ?? stageName;

  // Quick filters for the time-slot dropdowns
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("morning");
  const [granularity, setGranularity] = useState<Granularity>(30);

  // Timezone selection — defaults to the browser's detected zone, falls back to IST
  const detectedTimezone =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "Asia/Kolkata";
  const [timezone, setTimezone] = useState<string>(detectedTimezone);

  const COMMON_TIMEZONES: { value: string; label: string }[] = [
    { value: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)" },
    { value: "Asia/Dubai", label: "Gulf Standard Time (GST, UTC+4:00)" },
    { value: "Asia/Singapore", label: "Singapore Time (SGT, UTC+8:00)" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (JST, UTC+9:00)" },
    { value: "Australia/Sydney", label: "Australian Eastern Time (AEST/AEDT)" },
    { value: "Europe/London", label: "United Kingdom (GMT/BST)" },
    { value: "Europe/Berlin", label: "Central European Time (CET/CEST)" },
    { value: "Europe/Paris", label: "Central European — Paris (CET/CEST)" },
    { value: "America/New_York", label: "Eastern Time — New York (ET)" },
    { value: "America/Chicago", label: "Central Time — Chicago (CT)" },
    { value: "America/Denver", label: "Mountain Time — Denver (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles (PT)" },
    { value: "America/Sao_Paulo", label: "Brasília Time (BRT)" },
    { value: "UTC", label: "Coordinated Universal Time (UTC)" },
  ];

  // Full IANA list when the runtime supports it; otherwise fall back to the curated set.
  const allIanaTimezones: string[] = useMemo(() => {
    try {
      const supportedFn = (Intl as unknown as {
        supportedValuesOf?: (key: string) => string[];
      }).supportedValuesOf;
      if (typeof supportedFn === "function") {
        return supportedFn("timeZone");
      }
    } catch {
      /* ignore */
    }
    return COMMON_TIMEZONES.map((t) => t.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combine: detected zone (if missing) + curated common labels first, then every other IANA zone.
  const timezoneChoices = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string; group: "detected" | "common" | "all" }[] = [];

    if (!COMMON_TIMEZONES.some((t) => t.value === detectedTimezone)) {
      list.push({
        value: detectedTimezone,
        label: `${detectedTimezone} (detected)`,
        group: "detected",
      });
      seen.add(detectedTimezone);
    }

    for (const tz of COMMON_TIMEZONES) {
      if (!seen.has(tz.value)) {
        list.push({ ...tz, group: "common" });
        seen.add(tz.value);
      }
    }

    for (const tz of allIanaTimezones) {
      if (!seen.has(tz)) {
        list.push({ value: tz, label: tz, group: "all" });
        seen.add(tz);
      }
    }
    return list;
  }, [allIanaTimezones, detectedTimezone]);

  const [tzPickerOpen, setTzPickerOpen] = useState(false);

  // Friendly TZ abbreviation like "IST" / "PDT" / "GMT+5:30" for the chosen zone+date
  const getTimezoneAbbr = (date: Date, tz: string): string => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "short",
      }).formatToParts(date);
      return parts.find((p) => p.type === "timeZoneName")?.value || tz;
    } catch {
      return tz;
    }
  };

  // Convert a wall-clock "YYYY-MM-DD HH:mm" pair (interpreted IN the given
  // timezone) into a UTC epoch (ms). Used by inline validation so a slot like
  // "today 09:00 IST" picked from a browser running in PST is correctly
  // compared against the real `Date.now()`. Returns NaN if inputs are invalid.
  const slotEpochInTimezone = (dateStr: string, timeStr: string, tz: string): number => {
    if (!dateStr || !timeStr) return NaN;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return NaN;
    // Build a UTC guess, then measure how that instant is rendered in the
    // target timezone and correct for the offset.
    const utcGuess = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = fmt.formatToParts(new Date(utcGuess));
      const lookup: Record<string, string> = {};
      for (const p of parts) lookup[p.type] = p.value;
      const renderedHour = lookup.hour === "24" ? 0 : Number(lookup.hour);
      const asTzMs = Date.UTC(
        Number(lookup.year),
        Number(lookup.month) - 1,
        Number(lookup.day),
        renderedHour,
        Number(lookup.minute),
      );
      const offset = asTzMs - utcGuess;
      return utcGuess - offset;
    } catch {
      return utcGuess;
    }
  };

  // Format a "YYYY-MM-DD" + "HH:mm" wall-clock pair into a confirmation label,
  // appending the abbreviation for the user's selected timezone.
  const formatBookedDateTime = (dateStr: string, timeStr: string, tz: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const reference = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const dateLabel = reference.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const h = hh || 0;
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    const timeLabel = `${displayHour}:${(mm || 0).toString().padStart(2, "0")} ${ampm}`;
    return { dateLabel, timeLabel, tzAbbr: getTimezoneAbbr(reference, tz) };
  };

  // ── Inline validation for the single-preferred-timing form ──
  // Recomputed whenever date/time/timezone/existingBooking changes so the UI
  // can show field-level errors and disable the submit button without waiting
  // for the user to click. Logic:
  //   1. Date is required and must not be before "today" in the chosen tz.
  //   2. Time is required.
  //   3. If the slot is today (in tz), it must be ≥ 10 min in the future to
  //      match the next-available-slot rule used elsewhere.
  //   4. The chosen slot must differ from any existing booking — picking the
  //      same date+time as the prior slot is not a valid reschedule.
  const slotValidation = useMemo(() => {
    const errors: { date?: string; time?: string } = {};
    if (!demoDate) errors.date = "Please select a date.";
    if (!demoTime1) errors.time = "Please choose a preferred time.";

    if (demoDate && demoTime1) {
      const slotMs = slotEpochInTimezone(demoDate, demoTime1, timezone);
      if (Number.isNaN(slotMs)) {
        errors.time = "Selected time is invalid for this timezone.";
      } else {
        const minLeadMs = 10 * 60 * 1000;
        if (slotMs < Date.now() + minLeadMs) {
          errors.time =
            `This time has already passed in ${getTimezoneAbbr(new Date(), timezone)}. ` +
            `Please pick a slot at least 10 minutes from now.`;
        }
        if (
          existingBooking &&
          existingBooking.booking_date === demoDate &&
          existingBooking.booking_time === demoTime1
        ) {
          errors.time =
            "This matches your current booking. Pick a different date or time to reschedule.";
        }
      }
    }

    return { errors, isValid: Object.keys(errors).length === 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoDate, demoTime1, timezone, existingBooking]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!candidateId) {
        setError("Invalid booking link. Missing candidate information.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("interview_candidates")
          .select(`
            *,
            candidate:profiles(full_name, email),
            job:jobs(job_title, employer:profiles!jobs_employer_id_fkey(company_name))
          `)
          .eq("id", candidateId)
          .single();

        if (fetchError || !data) {
          setError("Could not find your interview details. Please contact support.");
          setLoading(false);
          return;
        }

        setCandidateInfo({
          name: (data.candidate as any)?.full_name || "Candidate",
          email: (data.candidate as any)?.email || "",
          jobTitle: (data.job as any)?.job_title || "Position",
          companyName: (data.job as any)?.employer?.company_name || "Company",
        });

        // Pre-load any prior slot booking for this candidate + booking_type so
        // we can show a "Reschedule" confirmation dialog instead of silently
        // overwriting their existing time.
        const candidateProfileId = (data as any)?.candidate_id;
        if (candidateProfileId) {
          const { data: priorBookings } = await supabase
            .from("slot_bookings")
            .select("booking_date, booking_time")
            .eq("candidate_id", candidateProfileId)
            .eq("booking_type", bookingType)
            .order("created_at", { ascending: false })
            .limit(1);
          if (priorBookings && priorBookings.length > 0) {
            setExistingBooking({
              booking_date: priorBookings[0].booking_date,
              booking_time: priorBookings[0].booking_time,
            });
          }
        }
      } catch (err) {
        setError("Something went wrong. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [candidateId, bookingType]);

  // Generate available dates (today + next 7 days, including all days)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const value = formatDateValue(date);
      const label = date.toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      dates.push({ value, label: i === 0 ? `Today - ${label}` : label });
    }
    return dates;
  };

  const getTodayDate = () => {
    return formatDateValue(new Date());
  };

  const getNext10MinTime = () => getNextAvailableSlot().time;

  // Wrapper that defaults to current granularity/period state
  const getTimeSlots = (
    granularityMin: Granularity = granularity,
    period: TimeOfDay = timeOfDay,
  ) => buildTimeSlots(granularityMin, period);

  /**
   * Single source of truth for invoking an invitation/test-link email.
   * Updates `inviteStatus` so the confirmation screen can show a verified
   * "sent" indicator (or a retry button) without each call site having to
   * remember to update the same three pieces of state.
   */
  const sendInvitationEmail = async (
    args: {
      functionName: InvitationFunctionName;
      body: Record<string, unknown>;
      /**
       * The stage the candidate is booking for. Used by
       * `assertInvitationRoute` to verify we're calling the RIGHT edge
       * function for this stage before we hit the network. Required so
       * regressions in routing fail loudly at the booking step instead
       * of silently never delivering a test link.
       */
      expectedStageName: string;
      validateForDelivery?: boolean;
    },
  ): Promise<{ ok: boolean; error?: string }> => {
    // ── Pre-flight: assert the routing is correct for this stage ──
    // If a future change wires "Technical Assessment" through the Written
    // Test pipeline (or vice-versa), this throws BEFORE the booking is
    // confirmed, the candidate sees an actionable error, and we don't
    // silently drop the test-link email.
    try {
      (args.validateForDelivery ? assertInvitationDeliveryRoute : assertInvitationRoute)(
        args.expectedStageName,
        args.functionName as any,
      );
    } catch (routeErr: any) {
      const msg = routeErr?.message || "Booking aborted: invitation routing mismatch.";
      console.error("[invitation pre-flight] routing assertion failed", msg);
      setInviteStatus("failed");
      setInviteError(msg);
      return { ok: false, error: msg };
    }
    setInviteStatus("sending");
    setInviteError(null);
    try {
      const { data, error } = await supabase.functions.invoke(args.functionName, {
        body: args.body,
      });
      // Edge function explicitly returns { success: true } on the happy path.
      // We also have to treat `{ blocked: true }` as a failure — the pipeline
      // gateway returns this WITHOUT a `success` field when it refuses to send
      // (e.g. idempotency, sequential-flow, locking). Without this guard, a
      // reschedule that hits "already_sent" would show a green checkmark while
      // no email actually goes out.
      const isBlocked = data && (data as any).blocked === true;
      if (error || (data && data.success === false) || isBlocked) {
        const msg =
          error?.message ||
          (isBlocked ? (data as any).message : null) ||
          data?.error ||
          "Failed to send invitation email.";
        console.error(`[${args.functionName}] invitation send failed`, msg, data);
        setInviteStatus("failed");
        setInviteError(msg);
        return { ok: false, error: msg };
      }
      setInviteStatus("sent");
      setInviteSentAt(new Date());
      // Fetch the actual meeting/test link the edge function just stored.
      // We display it inline on the confirmation screen so the candidate can
      // start the test immediately even if the email is delayed or filtered.
      // RLS policy "Candidates can view their own invitations" allows this.
      try {
        const { data: invitationRow } = await supabase
          .from("interview_invitations")
          .select("meeting_link, expires_at, interview_event_id, interview_events!inner(interview_candidate_id)")
          .eq("interview_events.interview_candidate_id", candidateId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (invitationRow?.meeting_link) {
          setInterviewLink(invitationRow.meeting_link);
        }
        if (invitationRow?.expires_at) {
          setLinkExpiresAt(new Date(invitationRow.expires_at));
        }
      } catch (linkErr) {
        // Not fatal — the email itself was sent. Just log.
        console.warn("Could not fetch meeting link for inline display", linkErr);
      }
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || "Failed to send invitation email.";
      console.error(`[${args.functionName}] invitation send threw`, err);
      setInviteStatus("failed");
      setInviteError(msg);
      return { ok: false, error: msg };
    }
  };

  /**
   * Manual resend triggered from the confirmation screen. Reuses the same
   * routing logic the booking flow used so the candidate gets exactly the
   * same email they would have received automatically.
   */
  const handleResendInvitation = async () => {
    if (!candidateId || !selectedDate || !selectedTime) return;
    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    const invocation = buildInvitationDeliveryInvocation({
      interviewCandidateId: candidateId,
      stageName,
      scheduledDate: scheduledDateTime,
      triggerSource: "book-slot-resend",
      // Manual resend always force-resends. The candidate explicitly clicked
      // "Resend" — they want a new email even if one was logged earlier.
      forceResend: true,
    });
    const result = await sendInvitationEmail({
      functionName: invocation.functionName,
      expectedStageName: stageName,
      body: invocation.body,
      validateForDelivery: true,
    });
    if (result.ok) {
      toast.success("Invitation email resent. Please check your inbox.");
    } else {
      toast.error(result.error || "Could not resend the invitation email.");
    }
  };

  // Validate the form once before either showing the reschedule confirmation
  // dialog or proceeding directly. Returns true when inputs are usable.
  const validateBookingInputs = (): boolean => {
    if (isMultiSlotStage) {
      if (!slotValidation.isValid) {
        toast.error(
          slotValidation.errors.date ||
            slotValidation.errors.time ||
            "Please select a valid date and time.",
        );
        return false;
      }
    } else if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return false;
    }
    if (!candidateId) {
      toast.error("Invalid booking link - missing candidate information");
      return false;
    }
    return true;
  };

  // Submit-button click. If the candidate already has a slot for this round,
  // open the reschedule confirmation dialog so they can verify the new
  // booking type + time before we delete the prior row. Otherwise, fall
  // through to the normal booking flow.
  const handleSubmitClick = () => {
    if (!validateBookingInputs()) return;
    if (existingBooking) {
      // Reset reschedule machine each time we open the dialog so a previous
      // failed attempt doesn't pre-fill an error or leave the action button
      // stuck in the wrong state.
      setRescheduleStatus("idle");
      setRescheduleError(null);
      setShowRescheduleConfirm(true);
      return;
    }
    void handleBookSlot();
  };

  /**
   * Reschedule confirm action. Implements stricter multi-step validation:
   *   1. Re-runs `validateBookingInputs` (the slot may have just expired
   *      while the dialog was open).
   *   2. Verifies the new slot is actually different from the existing one.
   *   3. Awaits `handleBookSlot` and only treats the reschedule as complete
   *      when `isBooked` flips true. On failure we keep the dialog open with
   *      an inline error so the candidate cannot accidentally proceed
   *      thinking their new time was saved.
   */
  const handleConfirmReschedule = async () => {
    setRescheduleStatus("validating");
    setRescheduleError(null);

    if (!validateBookingInputs()) {
      setRescheduleStatus("failed");
      setRescheduleError(
        "The selected time is no longer valid. Please pick another slot.",
      );
      return;
    }

    // Defence-in-depth: block confirming the exact same slot. The inline
    // validator already covers this for multi-slot stages, but single-slot
    // stages reach this path through `selectedDate`/`selectedTime` which
    // skip that check.
    if (
      existingBooking &&
      ((isMultiSlotStage &&
        existingBooking.booking_date === demoDate &&
        existingBooking.booking_time === demoTime1) ||
        (!isMultiSlotStage &&
          existingBooking.booking_date === selectedDate &&
          existingBooking.booking_time === selectedTime))
    ) {
      setRescheduleStatus("failed");
      setRescheduleError(
        "This matches your current slot. Pick a different date or time to reschedule.",
      );
      return;
    }

    setRescheduleStatus("submitting");
    try {
      await handleBookSlot();
    } catch (err: any) {
      setRescheduleStatus("failed");
      setRescheduleError(
        err?.message || "Could not reschedule your slot. Please try again.",
      );
    }
  };


  const handleBookSlot = async () => {
    // For multi-slot stages (demo/HR), build a single preferred slot from date + time
    let demoSlots: { date: string; time: string }[] = [];
    if (isMultiSlotStage) {
      if (!demoDate || !demoTime1) {
        toast.error("Please select a date and your preferred timing");
        return;
      }
      demoSlots = [{ date: demoDate, time: demoTime1 }];
      setPreferredSlots(demoSlots);
    } else {
      if (!selectedDate || !selectedTime) {
        toast.error("Please select both date and time");
        return;
      }
    }
    if (!candidateId) {
      toast.error("Invalid booking link - missing candidate information");
      return;
    }

    setIsBooking(true);
    try {
      // Create slot booking record
      const { data: interviewCandidate } = await supabase
        .from("interview_candidates")
        .select("candidate_id")
        .eq("id", candidateId)
        .single();

      // Determine booking type based on stage name
      const isWrittenTestSlotBooking = stageName.toLowerCase().includes("written") && !isFeedbackStage;
      const isHrSlotBooking = stageName.toLowerCase().includes("hr") && !isFeedbackStage;
      const isSegmentSlotBooking = stageName.toLowerCase().includes("segment") && !isFeedbackStage;
      const isAdminAcademicSlotBooking = stageName.toLowerCase().includes("admin") && stageName.toLowerCase().includes("academic") && !isFeedbackStage;
      const isCoreTeamSlotBooking = stageName.toLowerCase().includes("core team") && !isFeedbackStage;
      const isManagementSlotBooking = stageName.toLowerCase().includes("management") && !isFeedbackStage;

      const bookingType = isDemoStage ? "demo_round" 
        : isHrSlotBooking ? "hr_round"
        : isSegmentSlotBooking ? "segment_round"
        : isAdminAcademicSlotBooking ? "admin_academic_round"
        : isCoreTeamSlotBooking ? "core_team_round"
        : isManagementSlotBooking ? "management_round"
        : isWrittenTestSlotBooking ? "written_test" 
        : "technical_assessment";

      // Detect rebook: any existing slot_bookings for this candidate + booking_type.
      // We delete them first so the new booking REPLACES the old one instead of
      // creating a duplicate row (the table has no unique constraint on
      // candidate_id + booking_type, so a plain insert would silently stack rows
      // and the dashboard would keep showing the stale time).
      let isRebook = false;
      if (interviewCandidate?.candidate_id) {
        const { data: existingBookings, error: fetchExistingError } = await supabase
          .from("slot_bookings")
          .select("id")
          .eq("candidate_id", interviewCandidate.candidate_id)
          .eq("booking_type", bookingType);

        if (fetchExistingError) {
          console.error("Error checking existing slot bookings:", fetchExistingError);
        }

        if (existingBookings && existingBookings.length > 0) {
          isRebook = true;
          const { error: deleteError } = await supabase
            .from("slot_bookings")
            .delete()
            .in("id", existingBookings.map((b) => b.id));
          if (deleteError) {
            console.error("Error clearing previous slot bookings:", deleteError);
            // Throw so the outer catch flips the reschedule status to "failed"
            // and surfaces the message inside the dialog instead of silently
            // exiting and leaving the candidate stuck.
            throw new Error("Failed to update your previous booking. Please try again.");
          }
        }

        if (isMultiSlotStage) {
          const { error: insertError } = await supabase.from("slot_bookings").insert({
            candidate_id: interviewCandidate.candidate_id,
            booking_date: demoSlots[0].date,
            booking_time: demoSlots[0].time,
            booking_type: bookingType,
            status: "pending",
            subject: stageName,
            preferred_slots: demoSlots as any,
          });
          if (insertError) {
            console.error("Error inserting slot booking:", insertError);
            throw new Error("Failed to save booking. Please try again.");
          }
        } else {
          const { error: insertError } = await supabase.from("slot_bookings").insert({
            candidate_id: interviewCandidate.candidate_id,
            booking_date: selectedDate,
            booking_time: selectedTime,
            booking_type: bookingType,
            status: "confirmed",
            subject: stageName,
          });
          if (insertError) {
            console.error("Error inserting slot booking:", insertError);
            throw new Error("Failed to save booking. Please try again.");
          }
        }
      }

      // Send notification to employer about slot booking
      try {
        const { data: icData } = await supabase
          .from("interview_candidates")
          .select("job_id, candidate_id, candidate:profiles(full_name, email), job:jobs(job_title, employer_id)")
          .eq("id", candidateId)
          .single();
        
        if (icData) {
          const cName = (icData.candidate as any)?.full_name || "A candidate";
          const jTitle = (icData.job as any)?.job_title || "a position";
          const empId = (icData.job as any)?.employer_id;
          if (empId) {
            const cEmail = (icData.candidate as any)?.email || null;
            await supabase.from("employer_notifications").insert({
              employer_id: empId,
              type: "slot_booking",
              title: `📅 Slot Booked: ${stageName}`,
              message: `${cName} has booked a slot for ${stageName} - ${jTitle}. ${isMultiSlotStage ? "Please review preferred timings and confirm." : `Date: ${selectedDate}, Time: ${selectedTime}`}`,
              candidate_name: cName,
              job_title: jTitle,
              booking_type: bookingType,
              recipient_email: cEmail,
            });
          }
        }
      } catch (notifErr) {
        console.error("Error creating employer notification:", notifErr);
      }

      // Auto-advance the pipeline FIRST, before sending the test/interview link.
      // The pipeline gateway (`send-pipeline-email`) blocks invitation emails for
      // the next stage until the current "Slot Booking" stage has a completed
      // event. If we send the email before advancing, the gateway returns
      // `previous_stage_incomplete` and the candidate never receives their link.
      // Skip on rebook so we don't double-advance past the next stage if the
      // candidate is just updating their preferred time.
      if (!isRebook) {
        try {
          await supabase.functions.invoke("process-interview-stage", {
            body: {
              interviewCandidateId: candidateId,
              action: "advance",
              feedback: `${stageName} slot booked by candidate, auto-advancing to next stage`,
            },
          });
        } catch (advanceErr) {
          console.error("Error auto-advancing after slot booking:", advanceErr);
        }
      }

      if (isMultiSlotStage) {
        try {
          await supabase.functions.invoke("send-demo-slot-confirmation", {
            body: {
              interviewCandidateId: candidateId,
              preferredSlots: demoSlots,
            },
          });
        } catch (emailErr) {
          console.error("Error sending slot confirmation email:", emailErr);
        }
      } else if (isWrittenTestSlotBooking) {
        // Route through pipeline email gateway for idempotency
        const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
        const result = await sendInvitationEmail({
          functionName: "send-pipeline-email",
          expectedStageName: stageName,
          body: {
            interviewCandidateId: candidateId,
            stageName: "Written Test",
            emailType: "interview_invitation",
            triggerSource: "book-slot",
            scheduledDate: scheduledDateTime,
            // On reschedule, force the gateway to re-send the test link with
            // the new date/time. Without this, the idempotency check blocks
            // the second email and the candidate never gets the updated link.
            forceResend: isRebook,
          },
        });
        if (!result.ok) {
          toast.warning("Slot booked, but we couldn't send the invitation email. You can resend it from the confirmation screen.");
        }
      } else {
        // Generic single-slot booking (e.g. Technical Assessment) — send the
        // interview/test invitation so the candidate gets the link for their booked time.
        const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
        const result = await sendInvitationEmail({
          functionName: "send-interview-invitation",
          expectedStageName: stageName,
          body: {
            interviewCandidateId: candidateId,
            stageName,
            scheduledDate: scheduledDateTime,
          },
        });
        if (!result.ok) {
          toast.warning("Slot booked, but we couldn't send the invitation email. You can resend it from the confirmation screen.");
        }
      }

      setIsBooked(true);
      setWasRescheduled(isRebook);
      if (isRebook) {
        // Mark the multi-step reschedule as confirmed and close the dialog —
        // we only reach this branch after the slot row was inserted AND any
        // invitation/notification side effects ran, so it is safe to let the
        // candidate proceed to the success screen.
        setRescheduleStatus("confirmed");
        setRescheduleError(null);
        setShowRescheduleConfirm(false);
      }
      if (isMultiSlotStage) {
        toast.success(
          isRebook
            ? "Preferred timings updated! The employer will confirm your new slot."
            : "Preferred timings submitted! The employer will confirm your slot."
        );
      } else {
        toast.success(
          isRebook
            ? "Slot rescheduled successfully! Your new time has been sent to the team."
            : "Slot booked successfully! Check your Interview Pipeline for next steps."
        );
      }
    } catch (err: any) {
      console.error("Error booking slot:", err);
      const msg = err?.message || "Failed to book slot. Please try again.";
      toast.error(msg);
      // Surface inside the reschedule dialog so the candidate can see WHY
      // the new time wasn't accepted and decide to retry — instead of the
      // dialog vanishing and leaving them to wonder if it worked.
      if (showRescheduleConfirm || existingBooking) {
        setRescheduleStatus("failed");
        setRescheduleError(msg);
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="max-w-md w-full">
          <div className="p-4 pb-0">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/candidate/dashboard?tab=pipeline")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Interview Pipeline
            </Button>
          </div>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            {isMultiSlotStage ? (
              <>
                <h2 className="text-xl font-bold text-foreground">
                  {wasRescheduled ? "Preferred Timing Updated! 🔁" : "Preferred Timing Submitted! 🎉"}
                </h2>
                <p className="text-muted-foreground">
                  {wasRescheduled
                    ? <>You have updated your preferred timing for <strong>{stageName}</strong>. Your earlier choice has been replaced.</>
                    : <>You have submitted your preferred timing for <strong>{stageName}</strong>.</>}
                </p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {demoDate
                        ? formatBookedDateTime(demoDate, "00:00", timezone).dateLabel
                        : ""}
                    </span>
                  </div>
                  {preferredSlots.map((slot, i) => {
                    const formatted = formatBookedDateTime(slot.date, slot.time, timezone);
                    return (
                      <div key={i} className="flex items-center justify-center gap-2 text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {formatted.timeLabel}{" "}
                          <span className="text-xs text-blue-600">({formatted.tzAbbr})</span>
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Times shown in <strong>{timezone}</strong>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground">
                  {wasRescheduled ? "Slot Rescheduled Successfully! 🔁" : "Slot Booked Successfully! 🎉"}
                </h2>
                <p className="text-muted-foreground">
                  {wasRescheduled
                    ? <>Your <strong>{stageName}</strong> has been moved to:</>
                    : <>Your <strong>{stageName}</strong> has been scheduled for:</>}
                </p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  {(() => {
                    const f = formatBookedDateTime(selectedDate, selectedTime, timezone);
                    return (
                      <>
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{f.dateLabel}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {f.timeLabel} <span className="text-sm text-blue-600">({f.tzAbbr})</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 text-center">
                          Time shown in <strong>{timezone}</strong>
                        </p>
                      </>
                    );
                  })()}
                </div>
                {stageName.toLowerCase().includes("hr") ? (
                  <p className="text-sm text-muted-foreground">
                    {wasRescheduled
                      ? "📧 You will receive an updated HR Round invitation email reflecting your new time. Please check your inbox."
                      : "📧 You will receive an HR Round invitation email with instructions shortly. Please check your inbox."}
                  </p>
                ) : (
                  // End-to-end verification: shows whether the invitation email
                  // actually went out, and lets the candidate resend it on demand.
                  // When `wasRescheduled` is true we make the copy explicit that
                  // the test/meeting link reflects the NEW time — otherwise a
                  // candidate might assume the old email is still valid.
                  <div className="rounded-lg border bg-card p-3 space-y-2 text-left">
                    <div className="flex items-start gap-2">
                      {inviteStatus === "sent" && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      )}
                      {inviteStatus === "sending" && (
                        <Loader2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0 animate-spin" />
                      )}
                      {inviteStatus === "failed" && (
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      {inviteStatus === "idle" && (
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="text-sm space-y-0.5 flex-1">
                        {inviteStatus === "sent" && (
                          <>
                            <p className="font-medium text-foreground">
                              {wasRescheduled ? "Updated invitation email sent" : "Invitation email sent"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {wasRescheduled ? "Resent to " : "Sent to "}
                              <strong>{candidateInfo?.email}</strong>
                              {inviteSentAt && ` at ${inviteSentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}.
                              {wasRescheduled
                                ? " It reflects your new time — please ignore the previous email."
                                : " Check your inbox (and spam folder)."}
                            </p>
                          </>
                        )}
                        {inviteStatus === "sending" && (
                          <p className="font-medium text-foreground">
                            {wasRescheduled ? "Sending updated invitation email…" : "Sending invitation email…"}
                          </p>
                        )}
                        {inviteStatus === "failed" && (
                          <>
                            <p className="font-medium text-red-700">
                              {wasRescheduled
                                ? "Couldn't send the updated invitation email"
                                : "Couldn't send the invitation email"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inviteError ||
                                (wasRescheduled
                                  ? "Please retry — your new slot is still saved."
                                  : "Please retry — your slot is still booked.")}
                            </p>
                          </>
                        )}
                        {inviteStatus === "idle" && (
                          <p className="text-xs text-muted-foreground">
                            {wasRescheduled
                              ? <>We'll send the updated test link to <strong>{candidateInfo?.email}</strong>.</>
                              : <>We'll send the test link to <strong>{candidateInfo?.email}</strong>.</>}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Inline test/meeting link — surfaced as soon as the
                        invitation row is created so the candidate can join
                        even if email delivery is delayed. */}
                    {interviewLink && (() => {
                      // Compute a friendly validity hint. The edge function
                      // sets expires_at to 7 days from send. We re-evaluate
                      // on every render so the badge stays accurate without
                      // a timer.
                      const now = Date.now();
                      const expMs = linkExpiresAt?.getTime() ?? null;
                      const msLeft = expMs !== null ? expMs - now : null;
                      const isExpired = msLeft !== null && msLeft <= 0;
                      const hoursLeft = msLeft !== null ? Math.floor(msLeft / (1000 * 60 * 60)) : null;
                      const daysLeft = hoursLeft !== null ? Math.floor(hoursLeft / 24) : null;
                      let validityLabel = "";
                      if (msLeft === null) {
                        validityLabel = "Validity: 7 days from email";
                      } else if (isExpired) {
                        validityLabel = "Link expired — please resend or rebook";
                      } else if (daysLeft !== null && daysLeft >= 1) {
                        validityLabel = `Valid for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}`;
                      } else if (hoursLeft !== null && hoursLeft >= 1) {
                        validityLabel = `Valid for ${hoursLeft} more hour${hoursLeft === 1 ? "" : "s"}`;
                      } else {
                        validityLabel = "Expires in less than an hour";
                      }
                      // Render the expiry in the candidate's LOCAL timezone
                      // (toLocaleString w/ undefined locale === browser locale)
                      // and append a short tz hint so they can disambiguate
                      // when sharing screenshots, traveling, etc.
                      // `timeZoneName: "short"` produces e.g. "GMT+5:30" / "PST".
                      // We also resolve the IANA zone (e.g. "Asia/Kolkata") for
                      // the title tooltip — useful when "GMT+5:30" alone is ambiguous.
                      const expiresAtLabel = linkExpiresAt
                        ? linkExpiresAt.toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })
                        : null;
                      const ianaTimeZone = (() => {
                        try {
                          return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
                        } catch {
                          return null;
                        }
                      })();
                      const timeZoneHint = ianaTimeZone
                        ? `Times shown in your local time zone (${ianaTimeZone}).`
                        : "Times shown in your local time zone.";
                      return (
                        <div
                          className={`rounded-md border p-2.5 space-y-2 ${
                            isExpired
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-blue-200 bg-blue-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-[11px] font-medium flex items-center gap-1.5 ${isExpired ? "text-destructive" : "text-blue-900"}`}>
                              <Mail className="h-3 w-3" />
                              {isExpired ? "Your test link has expired" : "Your test link is ready"}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isExpired
                                  ? "bg-destructive/15 text-destructive"
                                  : msLeft !== null && msLeft < 24 * 60 * 60 * 1000
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                              title={expiresAtLabel ? `Expires ${expiresAtLabel}\n${timeZoneHint}` : timeZoneHint}
                            >
                              {validityLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Input
                              readOnly
                              value={interviewLink}
                              onFocus={(e) => e.currentTarget.select()}
                              className="h-7 text-[11px] font-mono bg-background"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 shrink-0"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(interviewLink);
                                  setLinkCopied(true);
                                  toast.success("Link copied");
                                  setTimeout(() => setLinkCopied(false), 2000);
                                } catch {
                                  toast.error("Could not copy. Long-press the link to copy manually.");
                                }
                              }}
                            >
                              {linkCopied ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <span className="text-[11px]">Copy</span>
                              )}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isExpired}
                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                            onClick={() => window.open(interviewLink, "_blank", "noopener,noreferrer")}
                          >
                            {isExpired ? "Link no longer valid" : "Open test link"}
                          </Button>
                          <p className={`text-[10px] ${isExpired ? "text-destructive/80" : "text-blue-800/80"}`}>
                            {isExpired
                              ? `Use "Resend invitation" below to get a fresh link, or rebook your slot. ${timeZoneHint}`
                              : expiresAtLabel
                                ? `Expires on ${expiresAtLabel}. ${timeZoneHint} Bookmark this page or copy the link in case the email is delayed.`
                                : `${timeZoneHint} Tip: bookmark this page or copy the link in case the email is delayed.`}
                          </p>
                        </div>
                      );
                    })()}
                    <Button
                      type="button"
                      variant={inviteStatus === "failed" ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={handleResendInvitation}
                      disabled={inviteStatus === "sending"}
                    >
                      {inviteStatus === "sending" ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-2" />
                          {inviteStatus === "sent" ? "Resend test link" : "Send test link"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
            <div className="pt-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {candidateInfo?.jobTitle} at {candidateInfo?.companyName}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <div className="p-3 pb-0">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/candidate/dashboard?tab=pipeline")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Pipeline
          </Button>
        </div>
        <CardHeader className="text-center pb-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Your {stageName} Slot
          </CardTitle>
          <p className="text-blue-100 text-sm mt-1">{stageName} for {candidateInfo?.jobTitle}</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Candidate Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{candidateInfo?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {candidateInfo?.jobTitle} at {candidateInfo?.companyName}
              </span>
            </div>
          </div>

          {/* Timezone Selector — applies to both single-slot and multi-slot flows */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Your Timezone *
            </label>
            <Popover open={tzPickerOpen} onOpenChange={setTzPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-label="Select your timezone"
                  aria-expanded={tzPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate text-left">
                    {timezoneChoices.find((tz) => tz.value === timezone)?.label || timezone}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 z-[1500]"
                align="start"
              >
                <Command
                  filter={(value, search) => {
                    // Match either the IANA id or the curated label, case-insensitively.
                    const tz = timezoneChoices.find((t) => t.value === value);
                    const haystack = `${value} ${tz?.label ?? ""}`.toLowerCase();
                    return haystack.includes(search.toLowerCase()) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Search timezone (e.g. Vancouver, GMT, UTC)…" />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>No matching timezone.</CommandEmpty>
                    {(["detected", "common", "all"] as const).map((groupKey) => {
                      const items = timezoneChoices.filter((tz) => tz.group === groupKey);
                      if (items.length === 0) return null;
                      const heading =
                        groupKey === "detected"
                          ? "Detected"
                          : groupKey === "common"
                            ? "Common timezones"
                            : "All IANA timezones";
                      return (
                        <CommandGroup key={groupKey} heading={heading}>
                          {items.map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={tz.value}
                              onSelect={(val) => {
                                setTimezone(val);
                                setTzPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  timezone === tz.value ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="flex-1 truncate">{tz.label}</span>
                              {tz.label !== tz.value && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  {tz.value}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground">
              Slot times below are interpreted in this timezone — the confirmation will show
              the booked time as <strong>{getTimezoneAbbr(new Date(), timezone)}</strong>.
            </p>
          </div>

          {isMultiSlotStage ? (
            <>
              {/* Multi-slot: Single Date + Preferred Time */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800 font-medium">
                  📋 Select a date and your preferred timing. The employer will confirm and send you the meeting link.
                </p>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Select Date *
                </label>
                <Select value={demoDate} onValueChange={setDemoDate}>
                  <SelectTrigger
                    aria-invalid={Boolean(slotValidation.errors.date)}
                    aria-describedby={slotValidation.errors.date ? "demo-date-error" : undefined}
                    className={cn(
                      slotValidation.errors.date && "border-destructive focus:ring-destructive",
                    )}
                  >
                    <SelectValue placeholder="Choose a date" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates().map((date) => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {slotValidation.errors.date && (
                  <p
                    id="demo-date-error"
                    role="alert"
                    className="flex items-start gap-1 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{slotValidation.errors.date}</span>
                  </p>
                )}
              </div>

              {/* Single Time Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  Select Preferred Timing *
                </label>

                {/* Quick filters: time of day + granularity */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
                  {([
                    { key: "morning", label: "🌅 Morning (12 AM – 12 PM)" },
                    { key: "afternoon", label: "☀️ Afternoon (12 PM – 5 PM)" },
                    { key: "evening", label: "🌙 Evening (5 PM – 12 AM)" },
                  ] as { key: TimeOfDay; label: string }[]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTimeOfDay(opt.key)}
                      aria-pressed={timeOfDay === opt.key}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        timeOfDay === opt.key
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-border" />
                  <span className="text-xs font-medium text-muted-foreground mr-1">Step:</span>
                  {([15, 30] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        granularity === g
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {g} min
                    </button>
                  ))}
                </div>

                <Select value={demoTime1} onValueChange={setDemoTime1}>
                  <SelectTrigger
                    className={cn(
                      "flex-1",
                      slotValidation.errors.time && "border-destructive focus:ring-destructive",
                    )}
                    aria-invalid={Boolean(slotValidation.errors.time)}
                    aria-describedby={slotValidation.errors.time ? "demo-time-error" : undefined}
                  >
                    <SelectValue placeholder="Choose your preferred time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getTimeSlots().map((ts) => (
                      <SelectItem key={ts.value} value={ts.value}>
                        {ts.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {slotValidation.errors.time && (
                  <p
                    id="demo-time-error"
                    role="alert"
                    className="flex items-start gap-1 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{slotValidation.errors.time}</span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Times are interpreted in <strong>{getTimezoneAbbr(new Date(), timezone)}</strong>.
                  Pick a slot at least 10 minutes from now.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitClick}
                disabled={isBooking || !slotValidation.isValid}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 mr-2" />
                    Submit Preferred Timing
                  </>
                )}
              </Button>
            </>

          ) : (
            <>
              {/* Quick Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-sm font-semibold border-2 border-orange-400 text-orange-700 hover:bg-orange-100 bg-orange-50"
                  onClick={() => {
                    const nextSlot = getNextAvailableSlot();
                    setSelectedDate(nextSlot.date);
                    setSelectedTime(nextSlot.time);
                  }}
                >
                  🚀 Start Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-sm font-semibold border-2 border-green-400 text-green-700 hover:bg-green-100 bg-green-50"
                  onClick={() => {
                    const nextSlot = getNextAvailableSlot();
                    setSelectedDate(nextSlot.date);
                    setSelectedTime(nextSlot.time);
                  }}
                >
                  ⏰ Next 10 mins
                </Button>
              </div>

              {/* Today's Current Time Info */}
              {selectedDate === getTodayDate() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700">
                    <strong>Current time:</strong>{" "}
                    {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    {" • "}
                    <strong>Next available slot:</strong>{" "}
                    {getTimeSlots().find((s) => s.value === getNext10MinTime())?.label || getNext10MinTime()}
                  </p>
                </div>
              )}

              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Select Date *
                </label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a date" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates().map((date) => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Select Time *
                </label>

                {/* Quick filters: time of day + granularity */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
                  {([
                    { key: "morning", label: "🌅 Morning (12 AM – 12 PM)" },
                    { key: "afternoon", label: "☀️ Afternoon (12 PM – 5 PM)" },
                    { key: "evening", label: "🌙 Evening (5 PM – 12 AM)" },
                  ] as { key: TimeOfDay; label: string }[]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTimeOfDay(opt.key)}
                      aria-pressed={timeOfDay === opt.key}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        timeOfDay === opt.key
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-border" />
                  <span className="text-xs font-medium text-muted-foreground mr-1">Step:</span>
                  {([15, 30] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      aria-pressed={granularity === g}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        granularity === g
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {g} min
                    </button>
                  ))}
                </div>

                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a time slot" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getTimeSlots().map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info Note - only show for Written Test/Technical stages */}
              {!stageName.toLowerCase().includes("hr") && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Once booked, you'll receive an email with your interview link. 
                    The assessment consists of 10 MCQ questions with 90 seconds per question. 
                    Ensure you have a stable internet connection.
                  </p>
                </div>
              )}

              {/* Book Button */}
              <Button
                onClick={handleSubmitClick}
                disabled={isBooking || !selectedDate || !selectedTime}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : existingBooking ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Reschedule Slot
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reschedule confirmation — only shown when a prior slot exists for this
          candidate + booking_type. Lets the candidate verify the new time and
          round before we delete their previous booking. */}
      <AlertDialog
        open={showRescheduleConfirm}
        onOpenChange={(open) => {
          // Lock the dialog while the reschedule is in flight — the candidate
          // must not be able to dismiss/escape until the new time is either
          // confirmed by the backend or explicitly fails. This prevents the
          // "I clicked confirm and the dialog vanished — did it save?" bug.
          if (rescheduleStatus === "validating" || rescheduleStatus === "submitting") {
            return;
          }
          setShowRescheduleConfirm(open);
          if (!open) {
            setRescheduleStatus("idle");
            setRescheduleError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reschedule your {bookingTypeLabel}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Please confirm the new time for your <strong>{bookingTypeLabel}</strong>.
                  Your previous slot will be replaced.
                </p>
                {existingBooking && (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current slot</p>
                    <p className="font-medium text-foreground">
                      {formatBookedDateTime(existingBooking.booking_date, existingBooking.booking_time, timezone).dateLabel}
                      {" · "}
                      {formatBookedDateTime(existingBooking.booking_date, existingBooking.booking_time, timezone).timeLabel}
                      {" "}
                      ({formatBookedDateTime(existingBooking.booking_date, existingBooking.booking_time, timezone).tzAbbr})
                    </p>
                  </div>
                )}
                <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-primary">New slot</p>
                  {isMultiSlotStage ? (
                    <p className="font-medium text-foreground">
                      {demoTime1 ? (
                        <>
                          {formatBookedDateTime(demoDate, demoTime1, timezone).dateLabel}
                          {" · "}
                          {formatBookedDateTime(demoDate, demoTime1, timezone).timeLabel}
                          {" "}
                          ({formatBookedDateTime(demoDate, demoTime1, timezone).tzAbbr})
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="font-medium text-foreground">
                      {formatBookedDateTime(selectedDate, selectedTime, timezone).dateLabel}
                      {" · "}
                      {formatBookedDateTime(selectedDate, selectedTime, timezone).timeLabel}
                      {" "}
                      ({formatBookedDateTime(selectedDate, selectedTime, timezone).tzAbbr})
                    </p>
                  )}
                </div>

                {/* Inline status / error surface — keeps the candidate
                    inside the multi-step flow until the new slot is
                    actually accepted by the backend. */}
                {rescheduleStatus === "validating" && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Re-checking your selected slot…
                  </div>
                )}
                {rescheduleStatus === "submitting" && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving your new time. Please don't close this window…
                  </div>
                )}
                {rescheduleStatus === "failed" && rescheduleError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{rescheduleError}</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                isBooking ||
                rescheduleStatus === "validating" ||
                rescheduleStatus === "submitting"
              }
            >
              Keep current slot
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent the dialog from closing before the async flow runs;
                // it now only closes when `handleBookSlot` flips
                // rescheduleStatus to "confirmed" on the success path. On
                // failure the dialog stays open with the inline error so the
                // candidate can retry.
                e.preventDefault();
                void handleConfirmReschedule();
              }}
              disabled={
                isBooking ||
                rescheduleStatus === "validating" ||
                rescheduleStatus === "submitting"
              }
            >
              {rescheduleStatus === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming…
                </>
              ) : rescheduleStatus === "failed" ? (
                "Try again"
              ) : (
                "Confirm reschedule"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookSlot;
