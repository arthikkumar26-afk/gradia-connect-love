/**
 * Stage-name → invitation-email-route resolution.
 *
 * Centralized, pure, and testable so the BookSlot flow can:
 *   1. Decide which edge function to invoke for a given stage.
 *   2. Run a pre-flight check that asserts we're about to call the
 *      RIGHT function for the stage the candidate just booked, before
 *      we confirm the booking. This prevents regressions where (e.g.)
 *      a "Technical Assessment" booking would accidentally route through
 *      the Written Test pipeline gateway and never deliver a test link.
 *
 * Add new stages here — and a corresponding test in
 * `invitationRoute.test.ts` — instead of sprinkling `stageName.includes(...)`
 * checks across the booking page.
 */

/** Edge function that ultimately delivers the test/meeting link to the candidate. */
export type InvitationFunctionName =
  | "send-pipeline-email" // routes through the gateway (Written Test)
  | "send-interview-invitation" // direct send (Technical Assessment, AI, etc.)
  | "send-demo-slot-confirmation"; // multi-slot stages (Demo, HR, Segment, etc.)

export interface InvitationRoute {
  /** Edge function the booking flow MUST invoke for this stage. */
  functionName: InvitationFunctionName;
  /**
   * Canonical stage label to send to the edge function. Some stages
   * (e.g. "Written Round Test") get normalized to "Written Test" so the
   * server-side template lookup matches.
   */
  stageName: string;
  /**
   * Booking type stored on `slot_bookings.booking_type`. Mirrors the
   * existing values so we don't break dashboards that filter on it.
   */
  bookingType:
    | "written_test"
    | "technical_assessment"
    | "demo_round"
    | "hr_round"
    | "segment_round"
    | "admin_academic_round"
    | "core_team_round"
    | "management_round";
  /** True for stages where the candidate proposes 3 timings and the employer confirms one. */
  isMultiSlot: boolean;
  /** Only set when functionName === "send-pipeline-email". */
  emailType?: "interview_invitation";
}

const lower = (s: string) => s.toLowerCase();

/**
 * Resolve the email/booking route for a given stage name.
 *
 * Order matters: feedback stages are excluded first (they don't email a
 * test link), then multi-slot stages, then specific single-slot stages
 * (Written Test), and finally the "everything else" fallback —
 * Technical Assessment & friends — which goes through
 * `send-interview-invitation`.
 */
export function resolveInvitationRoute(rawStageName: string): InvitationRoute {
  const stage = lower(rawStageName ?? "");

  const isFeedback = stage.includes("feedback");
  if (isFeedback) {
    // Feedback stages don't send the candidate a test link, but the
    // booking flow may still call this helper. Treat as a "demo-style"
    // multi-slot booking so we never accidentally route to the
    // test-link functions.
    return {
      functionName: "send-demo-slot-confirmation",
      stageName: rawStageName,
      bookingType: "demo_round",
      isMultiSlot: true,
    };
  }

  // Multi-slot live-meeting stages — candidate proposes 3 times, employer picks one.
  const isDemo = stage.includes("demo");
  const isHr = stage.includes("hr");
  const isSegment = stage.includes("segment");
  const isAdminAcademic = stage.includes("admin") && stage.includes("academic");
  const isCoreTeam = stage.includes("core team");
  const isManagement = stage.includes("management");

  if (isDemo) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "demo_round", isMultiSlot: true };
  }
  if (isHr) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "hr_round", isMultiSlot: true };
  }
  if (isSegment) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "segment_round", isMultiSlot: true };
  }
  if (isAdminAcademic) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "admin_academic_round", isMultiSlot: true };
  }
  if (isCoreTeam) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "core_team_round", isMultiSlot: true };
  }
  if (isManagement) {
    return { functionName: "send-demo-slot-confirmation", stageName: rawStageName, bookingType: "management_round", isMultiSlot: true };
  }

  // Written test → routed through the pipeline-email gateway so duplicate
  // sends are deduped and the templated copy stays consistent.
  if (stage.includes("written")) {
    return {
      functionName: "send-pipeline-email",
      stageName: "Written Test",
      bookingType: "written_test",
      isMultiSlot: false,
      emailType: "interview_invitation",
    };
  }

  // Default: Technical Assessment, AI Interview, and any other
  // single-slot test stage. Goes directly through send-interview-invitation
  // so the candidate gets the deep link to their test.
  return {
    functionName: "send-interview-invitation",
    stageName: rawStageName,
    bookingType: "technical_assessment",
    isMultiSlot: false,
  };
}

/**
 * Pre-flight check: verify that the function we're about to invoke is the
 * one `resolveInvitationRoute` says we should invoke for this stage.
 *
 * Throws on mismatch so the booking flow can abort BEFORE it confirms
 * the slot — the candidate sees an actionable error instead of silently
 * not receiving a link.
 */
export function assertInvitationRoute(
  stageName: string,
  intendedFunctionName: InvitationFunctionName,
): InvitationRoute {
  const route = resolveInvitationRoute(stageName);
  if (route.functionName !== intendedFunctionName) {
    throw new Error(
      `Invitation routing mismatch for stage "${stageName}": ` +
        `expected "${route.functionName}" but flow is about to call "${intendedFunctionName}". ` +
        `This would skip the test-link email — booking aborted.`,
    );
  }
  return route;
}

type DeliveryFunctionName = Extract<
  InvitationFunctionName,
  "send-pipeline-email" | "send-interview-invitation"
>;

export interface InvitationDeliveryRoute {
  functionName: DeliveryFunctionName;
  stageName: string;
  emailType?: "interview_invitation";
}

export interface InvitationDeliveryInvocation {
  functionName: DeliveryFunctionName;
  body: Record<string, unknown>;
  route: InvitationDeliveryRoute;
}

/**
 * Resolve the correct sender for an already-scheduled interview/test link.
 *
 * This differs from booking-time routing:
 * - Written Test invitations must still flow through the pipeline gateway
 * - All other actual stage invitations (Technical Assessment, HR Round,
 *   Segment Round, etc.) should call `send-interview-invitation`
 */
export function resolveInvitationDeliveryRoute(rawStageName: string): InvitationDeliveryRoute {
  const stage = lower(rawStageName ?? "").trim();

  if (stage.includes("written")) {
    return {
      functionName: "send-pipeline-email",
      stageName: "Written Test",
      emailType: "interview_invitation",
    };
  }

  return {
    functionName: "send-interview-invitation",
    stageName: rawStageName,
  };
}

export function assertInvitationDeliveryRoute(
  stageName: string,
  intendedFunctionName: DeliveryFunctionName,
): InvitationDeliveryRoute {
  const route = resolveInvitationDeliveryRoute(stageName);
  if (route.functionName !== intendedFunctionName) {
    throw new Error(
      `Invitation delivery routing mismatch for stage "${stageName}": ` +
        `expected "${route.functionName}" but flow is about to call "${intendedFunctionName}".`,
    );
  }
  return route;
}

export function buildInvitationDeliveryInvocation(args: {
  interviewCandidateId: string;
  stageName: string;
  scheduledDate: string;
  meetingLink?: string;
  triggerSource?: string;
}): InvitationDeliveryInvocation {
  const route = resolveInvitationDeliveryRoute(args.stageName);

  if (route.functionName === "send-pipeline-email") {
    return {
      functionName: route.functionName,
      route,
      body: {
        interviewCandidateId: args.interviewCandidateId,
        stageName: route.stageName,
        emailType: route.emailType,
        triggerSource: args.triggerSource ?? "manual-invitation",
        scheduledDate: args.scheduledDate,
        ...(args.meetingLink ? { meetingLink: args.meetingLink } : {}),
      },
    };
  }

  return {
    functionName: route.functionName,
    route,
    body: {
      interviewCandidateId: args.interviewCandidateId,
      stageName: route.stageName,
      scheduledDate: args.scheduledDate,
      ...(args.meetingLink ? { meetingLink: args.meetingLink } : {}),
    },
  };
}
