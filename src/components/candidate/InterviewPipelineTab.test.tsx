/**
 * End-to-end-ish integration test for the AI-video Demo Slot booking flow.
 *
 * Scenario: a candidate has booked a Demo Slot for an "ai_video" demo, the
 * scheduled wall-clock time has already passed, and the booking row is still
 * in `pending` state (which is normal for AI-video demos because no employer
 * confirmation step is required). The dashboard must still surface a
 * "Start Demo" action so the candidate is not blocked, and clicking it must
 * navigate to the platform-hosted demo round (not an external meet link).
 *
 * Regression guard for the bug where candidates saw only "Reschedule Slot"
 * after their AI-video slot time had arrived.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Stable IDs the tests refer to. Keeping them as constants makes the seed
// data + assertions read identically.
// ---------------------------------------------------------------------------
const CANDIDATE_ID = "cand-1";
const INTERVIEW_CANDIDATE_ID = "ic-1";
const JOB_ID = "job-1";
const STAGE_ID_GUIDELINES = "stage-guidelines";
const STAGE_ID_RESUME = "stage-resume";
const STAGE_ID_DEMO_SLOT = "stage-demo-slot";
const STAGE_ID_DEMO_ROUND = "stage-demo-round";
const STAGE_ID_DEMO_FEEDBACK = "stage-demo-feedback";

// ---------------------------------------------------------------------------
// react-router navigate spy — we assert the Start Demo button routes to
// /candidate/demo-round with the right params.
// ---------------------------------------------------------------------------
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Sonner toast — silence + spy so unrelated success/error toasts don't fail.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fully-fledged supabase mock. The pipeline tab queries many tables; we model
// each one as a separate chain so the component sees realistic shapes without
// crashing on `.select().eq().order()` style calls.
//
// Test seeds drive what each call resolves to. Anything unconfigured returns
// an empty array / null so the component's defensive `|| []` paths kick in.
// ---------------------------------------------------------------------------
type TableSeed = Record<string, any[]>;

const tableSeeds: TableSeed = {
  interview_stages: [],
  interview_candidates: [],
  interview_events: [],
  interview_invitations: [],
  interview_responses: [],
  management_reviews: [],
  slot_bookings: [],
  resume_analyses: [],
};

vi.mock("@/integrations/supabase/client", () => {
  /**
   * Returns a chainable thenable that always resolves to the same payload.
   * Every supabase query terminator we use (`.eq`, `.in`, `.order`, `.limit`,
   * `.single`, `.maybeSingle`) hangs off this same object, so the component
   * can build any of its real chains and still get the seeded rows back.
   */
  const makeChain = (rows: any[] | (() => any[])) => {
    const get = () => (typeof rows === "function" ? rows() : rows);
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      filter: () => chain,
      gte: () => chain,
      lte: () => chain,
      single: async () => ({ data: get()[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: get()[0] ?? null, error: null }),
      then: (resolve: any) =>
        resolve({ data: get(), error: null }),
    };
    return chain;
  };

  const supabase = {
    from: (table: string) => makeChain(tableSeeds[table] ?? []),
    // Realtime: return a no-op channel so subscribe()/removeChannel() don't blow up.
    channel: () => {
      const ch: any = {
        on: () => ch,
        subscribe: (cb?: (s: string) => void) => {
          cb?.("SUBSCRIBED");
          return ch;
        },
      };
      return ch;
    },
    removeChannel: () => {},
    functions: {
      invoke: async () => ({ data: { ok: true }, error: null }),
    },
  };

  return { supabase };
});

// Imported AFTER the mocks above so the component picks up the stubbed client.
import { InterviewPipelineTab } from "./InterviewPipelineTab";

const seedAiVideoDemoBooking = (opts: { slotIsoLocal: string }) => {
  // Pipeline visible to the candidate. Order matters — Demo Slot Booking must
  // sit before Demo Round so the "current" math lands on the booking row.
  tableSeeds.interview_stages = [
    {
      id: STAGE_ID_GUIDELINES,
      name: "Interview Guidelines",
      stage_order: 1,
      is_ai_automated: true,
    },
    {
      id: STAGE_ID_RESUME,
      name: "CV/Resume",
      stage_order: 2,
      is_ai_automated: true,
    },
    {
      id: STAGE_ID_DEMO_SLOT,
      name: "Demo Slot Booking",
      stage_order: 3,
      is_ai_automated: false,
    },
    {
      id: STAGE_ID_DEMO_ROUND,
      name: "Demo Round",
      stage_order: 4,
      is_ai_automated: false,
    },
    {
      id: STAGE_ID_DEMO_FEEDBACK,
      name: "Demo Feedback",
      stage_order: 5,
      is_ai_automated: false,
    },
  ];

  tableSeeds.interview_candidates = [
    {
      id: INTERVIEW_CANDIDATE_ID,
      job_id: JOB_ID,
      ai_score: null,
      ai_analysis: null,
      status: "in_progress",
      // Anchors the "current" stage to Demo Slot Booking so the slot row is
      // the active one in the timeline.
      current_stage_id: STAGE_ID_DEMO_SLOT,
      applied_at: "2026-04-20T10:00:00Z",
      job: {
        job_title: "Demo Teacher",
        location: "Remote",
        // Empty pipeline_stages forces the component into the default-pipeline
        // path that uses every interview_stages row we seeded above.
        pipeline_stages: null,
        employer: { company_name: "Acme Edu", profile_picture: null },
      },
    },
  ];

  tableSeeds.interview_events = [
    {
      id: "evt-guidelines",
      stage_id: STAGE_ID_GUIDELINES,
      status: "completed",
      scheduled_at: null,
      completed_at: "2026-04-20T11:00:00Z",
      ai_score: null,
      ai_feedback: null,
      notes: null,
      interview_candidate_id: INTERVIEW_CANDIDATE_ID,
    },
    {
      id: "evt-resume",
      stage_id: STAGE_ID_RESUME,
      status: "completed",
      scheduled_at: null,
      completed_at: "2026-04-21T11:00:00Z",
      ai_score: 60,
      ai_feedback: null,
      notes: null,
      interview_candidate_id: INTERVIEW_CANDIDATE_ID,
    },
  ];

  // The AI-video demo booking — pending status, no meet link, slot time in
  // the past relative to the test's frozen "now".
  const [bookingDate, bookingTime] = opts.slotIsoLocal.split("T");
  tableSeeds.slot_bookings = [
    {
      id: "booking-1",
      booking_date: bookingDate,
      // Component renders/parses HH:mm — strip seconds.
      booking_time: bookingTime.slice(0, 5),
      booking_type: "demo_round",
      status: "pending",
      demo_meet_link: null,
      demo_meet_type: "ai_video",
      candidate_id: CANDIDATE_ID,
    },
  ];
};

const renderTab = () =>
  render(
    <MemoryRouter>
      <InterviewPipelineTab candidateId={CANDIDATE_ID} />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockReset();
  Object.keys(tableSeeds).forEach((k) => {
    tableSeeds[k] = [];
  });
  // Freeze "now" so the past-vs-future slot comparison is deterministic.
  // Note: shouldAdvanceTime keeps microtasks (supabase awaits, react effects)
  // resolving normally even though the wall clock is fake.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-04-25T14:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InterviewPipelineTab — AI-video Demo Slot flow", () => {
  it("shows 'Start Demo' once the booked AI-video slot time has passed and routes to /candidate/demo-round", async () => {
    // Slot booked for 13:00 local; now() is 14:00 → time has arrived.
    seedAiVideoDemoBooking({ slotIsoLocal: "2026-04-25T13:00:00" });

    renderTab();

    // Demo Slot Booking row should be visible once the initial fetch settles.
    await waitFor(
      () => {
        expect(screen.getByText("Demo Slot Booking")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // The new "Start Demo" button is the regression target. Use findBy to
    // tolerate the few extra effects the component runs after first paint.
    const startBtn = await screen.findByRole(
      "button",
      { name: /start demo/i },
      { timeout: 4000 },
    );
    expect(startBtn).toBeInTheDocument();

    // Reschedule must remain available so candidates can still move the slot
    // — the bug fix added Start Demo *alongside* Reschedule, not in place of it.
    expect(
      screen.getByRole("button", { name: /reschedule slot/i }),
    ).toBeInTheDocument();

    // Clicking "Start Demo" should navigate the candidate to the platform-
    // hosted AI demo route, not open an external link.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(startBtn);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    const target = String(navigateMock.mock.calls[0][0]);
    expect(target).toContain("/candidate/demo-round");
    expect(target).toContain(`interviewCandidateId=${INTERVIEW_CANDIDATE_ID}`);
    expect(target).toContain(`stageId=${STAGE_ID_DEMO_SLOT}`);
  });

  it("does NOT show 'Start Demo' while the booked slot time is still in the future", async () => {
    // Booked for 16:00; now() is 14:00 → still in the future.
    seedAiVideoDemoBooking({ slotIsoLocal: "2026-04-25T16:00:00" });

    renderTab();

    await waitFor(() => {
      expect(screen.getByText("Demo Slot Booking")).toBeInTheDocument();
    });

    // Reschedule is offered (booking exists, stage is current), but the
    // pre-time guard must keep "Start Demo" hidden until the slot opens.
    expect(
      screen.getByRole("button", { name: /reschedule slot/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /start demo/i }),
    ).not.toBeInTheDocument();
  });
});
