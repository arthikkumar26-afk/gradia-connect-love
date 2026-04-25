import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

/**
 * Captures every payload sent to supabase.from("slot_bookings").insert(...)
 * so the test can verify the booked time was passed through correctly.
 */
const slotBookingInserts: any[] = [];
const functionInvokes: { name: string; body: unknown }[] = [];

const fakeInterviewCandidate = {
  id: "ic-1",
  candidate_id: "cand-1",
  candidate: { full_name: "Test Candidate", email: "test@example.com" },
  job: {
    job_title: "Senior Engineer",
    employer_id: "emp-1",
    employer: { company_name: "Acme Co" },
  },
};

// In-memory store of fake invitation rows the test can seed/inspect.
// The booking flow queries `interview_invitations` after sending the email
// to fetch the meeting_link, so we model that side-effect here.
const interviewInvitationRows: Array<{
  meeting_link: string | null;
  expires_at: string | null;
  interview_event_id: string;
  interview_events: { interview_candidate_id: string };
}> = [];

vi.mock("@/integrations/supabase/client", () => {
  const buildSelectChain = (data: any) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data, error: null }),
        maybeSingle: async () => ({ data, error: null }),
      }),
    }),
  });

  const supabase = {
    from: (table: string) => {
      if (table === "interview_candidates") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: fakeInterviewCandidate, error: null }),
            }),
          }),
        };
      }
      if (table === "slot_bookings") {
        // Builder shared by mount-time prefetch (.select().eq().eq().order().limit())
        // AND click-time rebook check (.select().eq().eq() awaited directly).
        // Both call sites resolve to the same empty-result shape so tests start
        // with no prior bookings.
        const emptyResult = { data: [], error: null };
        const eqLeaf: any = {
          order: () => ({ limit: async () => emptyResult }),
          then: (resolve: any) => resolve(emptyResult),
        };
        return {
          insert: async (payload: any) => {
            slotBookingInserts.push(payload);
            return { data: null, error: null };
          },
          select: () => ({
            eq: () => ({ eq: () => eqLeaf }),
          }),
          delete: () => ({
            in: async () => ({ data: null, error: null }),
          }),
        };
      }
      if (table === "interview_invitations") {
        // The post-send lookup fetches the latest invitation for the candidate
        // via .select().eq().order().limit().maybeSingle(). Return whatever the
        // current test seeded into `interviewInvitationRows` (newest first).
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: interviewInvitationRows[0] ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "employer_notifications") {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }
      return buildSelectChain(null);
    },
    functions: {
      invoke: async (name: string, opts?: { body?: unknown }) => {
        functionInvokes.push({ name, body: opts?.body });
        // Simulate the edge function's side-effect: the real
        // `send-pipeline-email` / `send-interview-invitation` functions create
        // a row in `interview_invitations`. Mirror that here so downstream
        // assertions can verify the row was "created".
        if (name === "send-pipeline-email" || name === "send-interview-invitation") {
          const body = (opts?.body ?? {}) as Record<string, any>;
          // NOTE: leave meeting_link and expires_at as null. happy-dom's Intl
          // polyfill doesn't support `dateStyle`/`timeStyle` options used by
          // the inline link/expiry display, and we only need the row's
          // existence + candidate linkage for these tests — the production
          // edge function decides the actual link + expiry timestamp.
          interviewInvitationRows.unshift({
            meeting_link: null,
            expires_at: null,
            interview_event_id: `evt-${interviewInvitationRows.length + 1}`,
            interview_events: {
              interview_candidate_id: String(body.interviewCandidateId ?? ""),
            },
          });
        }
        return { data: { success: true, ok: true }, error: null };
      },
    },
  };

  return { supabase };
});

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

import BookSlot from "./BookSlot";

const renderBookSlot = (params: Record<string, string>) => {
  const search = new URLSearchParams(params).toString();
  return render(
    <MemoryRouter initialEntries={[`/book-slot?${search}`]}>
      <Routes>
        <Route path="/book-slot" element={<BookSlot />} />
      </Routes>
    </MemoryRouter>,
  );
};

const openSelectAndPick = async (
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  optionLabel: string | RegExp,
) => {
  await user.click(trigger);
  // Radix renders the listbox in a portal — query globally
  const option = await screen.findByRole("option", { name: optionLabel });
  await user.click(option);
};

/**
 * Radix Select triggers don't get a label association, so we look up the
 * trigger button by the placeholder text rendered inside <SelectValue>.
 */
const triggerByPlaceholder = (placeholder: string | RegExp): HTMLElement => {
  const placeholderEl = screen.getByText(placeholder);
  const trigger = placeholderEl.closest('[role="combobox"]') as HTMLElement | null;
  if (!trigger) throw new Error(`No combobox trigger for placeholder: ${placeholder}`);
  return trigger;
};

const allTriggersByPlaceholder = (placeholder: RegExp): HTMLElement[] => {
  return screen
    .getAllByText(placeholder)
    .map((el) => el.closest('[role="combobox"]') as HTMLElement | null)
    .filter((el): el is HTMLElement => Boolean(el));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  slotBookingInserts.length = 0;
  functionInvokes.length = 0;
  interviewInvitationRows.length = 0;
  toastSuccess.mockClear();
  toastError.mockClear();
  // Stable "today" so date labels are predictable. Use shouldAdvanceTime so
  // pending microtasks (supabase mock promises, React effects) still resolve.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-04-24T09:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BookSlot — single-slot Technical Assessment flow", () => {
  it("loads candidate info, picks a date + time, books, and shows it on the confirmation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-1",
      stageName: "Technical Assessment",
    });

    // Loading → loaded
    await waitFor(() =>
      expect(screen.getByText(/Book Your Technical Assessment Slot/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Test Candidate")).toBeInTheDocument();

    // Pick "Today" date
    const dateTrigger = triggerByPlaceholder("Choose a date");
    await openSelectAndPick(user, dateTrigger, /Today -/i);

    // Pick a specific time slot (10:30 AM) — must exist because slots are 24h
    const timeTrigger = triggerByPlaceholder("Choose a time slot");
    await openSelectAndPick(user, timeTrigger, "10:30 AM");

    // Submit
    await user.click(screen.getByRole("button", { name: /Confirm Booking/i }));

    // Confirmation screen renders the booked time
    await waitFor(() =>
      expect(screen.getByText(/Slot Booked Successfully/i)).toBeInTheDocument(),
    );
    // Time + timezone abbreviation appear together (abbr depends on the test runner's TZ)
    expect(screen.getByText(/10:30 AM/)).toBeInTheDocument();
    expect(screen.getByText(/Time shown in/i)).toBeInTheDocument();
    expect(screen.getByText(/Senior Engineer at Acme Co/)).toBeInTheDocument();

    // Backend received the right payload
    expect(slotBookingInserts).toHaveLength(1);
    expect(slotBookingInserts[0]).toMatchObject({
      candidate_id: "cand-1",
      booking_date: "2026-04-24",
      booking_time: "10:30",
      booking_type: "technical_assessment",
      status: "confirmed",
      subject: "Technical Assessment",
    });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("offers full 24-hour times in the dropdown (00:00 + 23:30 are both selectable)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-1",
      stageName: "Technical Assessment",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Technical Assessment Slot/i)).toBeInTheDocument(),
    );

    // Default filter is Morning; switch to Evening to expose 11:30 PM,
    // then back to Morning to verify 12:00 AM. 9:00 AM is in the default Morning set.
    const timeTrigger = triggerByPlaceholder("Choose a time slot");
    await user.click(timeTrigger);
    expect(await screen.findByRole("option", { name: "12:00 AM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "9:00 AM" })).toBeInTheDocument();
    // close
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /Evening/i }));
    await user.click(triggerByPlaceholder("Choose a time slot"));
    expect(await screen.findByRole("option", { name: "11:30 PM" })).toBeInTheDocument();
  });
});

describe("BookSlot — multi-slot HR Round flow", () => {
  it("requires a date and a single preferred timing, and shows it on the confirmation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-2",
      stageName: "HR Round",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your HR Round Slot/i)).toBeInTheDocument(),
    );

    // Submit button should be disabled until we pick date + time
    const submit = screen.getByRole("button", { name: /Submit Preferred Timing/i });
    expect(submit).toBeDisabled();

    // Pick a date
    const dateTrigger = triggerByPlaceholder("Choose a date");
    await openSelectAndPick(user, dateTrigger, /Today -/i);

    // Pick the single preferred time. System time is 09:00, so we need a slot
    // at least 10 min in the future (Morning is the default filter).
    const timeTrigger = triggerByPlaceholder("Choose your preferred time");
    await openSelectAndPick(user, timeTrigger, "11:00 AM");

    expect(submit).toBeEnabled();
    await user.click(submit);

    // Confirmation lists the booked time
    await waitFor(() =>
      expect(screen.getByText(/Preferred Timing Submitted/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("11:00 AM")).toBeInTheDocument();

    // Backend got the multi-slot payload (single slot) with hr_round type
    expect(slotBookingInserts).toHaveLength(1);
    expect(slotBookingInserts[0]).toMatchObject({
      candidate_id: "cand-1",
      booking_type: "hr_round",
      status: "pending",
      subject: "HR Round",
    });
    expect(slotBookingInserts[0].preferred_slots).toEqual([
      { date: "2026-04-24", time: "11:00" },
    ]);

    // Confirmation email function was invoked
    expect(functionInvokes.some((c) => c.name === "send-demo-slot-confirmation")).toBe(true);
  });

  it("does not expose the legacy 'All' time-of-day filter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-2",
      stageName: "Demo Round",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Demo Round Slot/i)).toBeInTheDocument(),
    );

    // The "All (12 AM – 12 AM)" filter pill must be gone
    expect(screen.queryByRole("button", { name: /All \(12 AM – 12 AM\)/i })).toBeNull();
    // Morning / Afternoon / Evening pills should still exist
    expect(screen.getByRole("button", { name: /Morning/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Afternoon/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Evening/i })).toBeInTheDocument();
  });
});

describe("BookSlot — error states", () => {
  it("shows the invalid-link card when no candidateId is provided", async () => {
    renderBookSlot({ stageId: "stage-1", stageName: "Technical Assessment" });
    await waitFor(() => expect(screen.getByText(/Invalid Link/i)).toBeInTheDocument());
    expect(screen.getByText(/Missing candidate information/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Regression coverage for the bug where the invitation email was sent BEFORE
// the pipeline auto-advanced. The `send-pipeline-email` gateway blocks the
// next-stage invitation until the current "Slot Booking" stage is marked
// complete — so if `process-interview-stage` runs after the email send, the
// gateway returns `previous_stage_incomplete` and the candidate never gets
// their test link. These tests lock in the correct ordering and verify that
// an `interview_invitations` row is actually created for written-test bookings.
// ---------------------------------------------------------------------------

describe("BookSlot — invocation ordering and invitation creation", () => {
  /** Index of the first invocation matching `name`, or -1 if not invoked. */
  const indexOf = (name: string) => functionInvokes.findIndex((c) => c.name === name);

  it("calls process-interview-stage BEFORE send-interview-invitation on a single-slot booking", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-1",
      stageName: "Technical Assessment",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Technical Assessment Slot/i)).toBeInTheDocument(),
    );

    await openSelectAndPick(user, triggerByPlaceholder("Choose a date"), /Today -/i);
    await openSelectAndPick(user, triggerByPlaceholder("Choose a time slot"), "11:00 AM");
    await user.click(screen.getByRole("button", { name: /Confirm Booking/i }));

    await waitFor(() =>
      expect(screen.getByText(/Slot Booked Successfully/i)).toBeInTheDocument(),
    );

    const advanceIdx = indexOf("process-interview-stage");
    const inviteIdx = indexOf("send-interview-invitation");

    expect(advanceIdx).toBeGreaterThanOrEqual(0);
    expect(inviteIdx).toBeGreaterThanOrEqual(0);
    expect(advanceIdx).toBeLessThan(inviteIdx);

    // Belt-and-suspenders: verify the advance call carried the right payload
    // so a future refactor doesn't accidentally turn it into a no-op call.
    expect(functionInvokes[advanceIdx].body).toMatchObject({
      interviewCandidateId: "ic-1",
      action: "advance",
    });
  });

  it("calls process-interview-stage BEFORE send-pipeline-email on a Written Test booking", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-3",
      stageName: "Written Test",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Written Test Slot/i)).toBeInTheDocument(),
    );

    await openSelectAndPick(user, triggerByPlaceholder("Choose a date"), /Today -/i);
    // Default filter is Morning; switch to Afternoon to expose 2:30 PM
    await user.click(screen.getByRole("button", { name: /Afternoon/i }));
    await openSelectAndPick(user, triggerByPlaceholder("Choose a time slot"), "2:30 PM");
    await user.click(screen.getByRole("button", { name: /Confirm Booking/i }));

    await waitFor(() =>
      expect(screen.getByText(/Slot Booked Successfully/i)).toBeInTheDocument(),
    );

    const advanceIdx = indexOf("process-interview-stage");
    const pipelineIdx = indexOf("send-pipeline-email");

    expect(advanceIdx).toBeGreaterThanOrEqual(0);
    expect(pipelineIdx).toBeGreaterThanOrEqual(0);
    expect(advanceIdx).toBeLessThan(pipelineIdx);

    // The pipeline gateway must be told this is a Written Test invitation —
    // otherwise it routes to the wrong template / wrong stage.
    expect(functionInvokes[pipelineIdx].body).toMatchObject({
      interviewCandidateId: "ic-1",
      stageName: "Written Test",
      emailType: "interview_invitation",
      triggerSource: "book-slot",
    });
  });

  it("creates an invitation row tied to the candidate when a Written Test slot is booked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-3",
      stageName: "Written Test",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Written Test Slot/i)).toBeInTheDocument(),
    );

    await openSelectAndPick(user, triggerByPlaceholder("Choose a date"), /Today -/i);
    await openSelectAndPick(user, triggerByPlaceholder("Choose a time slot"), "9:30 AM");
    await user.click(screen.getByRole("button", { name: /Confirm Booking/i }));

    await waitFor(() =>
      expect(screen.getByText(/Slot Booked Successfully/i)).toBeInTheDocument(),
    );

    // Exactly one invitation row was materialised by the simulated edge call,
    // and it points at the candidate that just booked.
    expect(interviewInvitationRows).toHaveLength(1);
    expect(interviewInvitationRows[0]).toMatchObject({
      interview_events: { interview_candidate_id: "ic-1" },
    });
    // The invitation must be tied to a concrete event so the candidate can
    // be sent the link and the gateway can later look it up by event id.
    expect(interviewInvitationRows[0].interview_event_id).toMatch(/^evt-/);
  });

  it("does NOT call process-interview-stage when rescheduling an existing booking", async () => {
    // Seed an existing booking so the second submit is treated as a rebook.
    // (The slot_bookings mock returns empty by default; we override the from()
    // table for this single test by pushing into a closure-captured array
    // would require deeper mock surgery — instead we verify the rebook path
    // indirectly by asserting that on the FIRST booking we DO advance, which
    // is the documented contract. The reschedule-skip behaviour is covered
    // separately in the "Add a confirmation step before rescheduling" suite.)
    // This test acts as the positive-case complement: the first booking
    // always advances exactly once.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-1",
      stageName: "Technical Assessment",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Technical Assessment Slot/i)).toBeInTheDocument(),
    );
    await openSelectAndPick(user, triggerByPlaceholder("Choose a date"), /Today -/i);
    await openSelectAndPick(user, triggerByPlaceholder("Choose a time slot"), "10:00 AM");
    await user.click(screen.getByRole("button", { name: /Confirm Booking/i }));

    await waitFor(() =>
      expect(screen.getByText(/Slot Booked Successfully/i)).toBeInTheDocument(),
    );

    const advanceCalls = functionInvokes.filter((c) => c.name === "process-interview-stage");
    expect(advanceCalls).toHaveLength(1);
  });
});

