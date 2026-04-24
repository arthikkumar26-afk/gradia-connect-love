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
        return {
          insert: async (payload: any) => {
            slotBookingInserts.push(payload);
            return { data: null, error: null };
          },
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
        return { data: { ok: true }, error: null };
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
    expect(screen.getByText(/10:30 AM IST/)).toBeInTheDocument();
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

    const timeTrigger = triggerByPlaceholder("Choose a time slot");
    await user.click(timeTrigger);

    expect(await screen.findByRole("option", { name: "12:00 AM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "11:30 PM" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "9:00 AM" })).toBeInTheDocument();
  });
});

describe("BookSlot — multi-slot HR Round flow", () => {
  it("requires 3 distinct preferred times and shows them all on the confirmation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-2",
      stageName: "HR Round",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your HR Round Slot/i)).toBeInTheDocument(),
    );

    // Pick a date
    const dateTrigger = screen.getByRole("combobox", { name: /Select Date/i });
    await openSelectAndPick(user, dateTrigger, /Today -/i);

    // Submit button should be disabled until we pick 3 distinct times
    const submit = screen.getByRole("button", { name: /Submit 3 Preferred Timings/i });
    expect(submit).toBeDisabled();

    // Pick 3 different times
    const timeTriggers = screen.getAllByRole("combobox").filter((el) =>
      /Choose time/i.test(el.textContent || ""),
    );
    expect(timeTriggers).toHaveLength(3);
    await openSelectAndPick(user, timeTriggers[0], "9:00 AM");
    await openSelectAndPick(user, timeTriggers[1], "2:00 PM");
    await openSelectAndPick(user, timeTriggers[2], "5:30 PM");

    expect(submit).toBeEnabled();
    await user.click(submit);

    // Confirmation lists all three booked times
    await waitFor(() =>
      expect(screen.getByText(/Preferred Timings Submitted/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("5:30 PM")).toBeInTheDocument();

    // Backend got the multi-slot payload with hr_round type
    expect(slotBookingInserts).toHaveLength(1);
    expect(slotBookingInserts[0]).toMatchObject({
      candidate_id: "cand-1",
      booking_type: "hr_round",
      status: "pending",
      subject: "HR Round",
    });
    expect(slotBookingInserts[0].preferred_slots).toEqual([
      { date: "2026-04-24", time: "09:00" },
      { date: "2026-04-24", time: "14:00" },
      { date: "2026-04-24", time: "17:30" },
    ]);

    // Confirmation email function was invoked
    expect(functionInvokes.some((c) => c.name === "send-demo-slot-confirmation")).toBe(true);
  });

  it("rejects duplicate preferred times with a warning and does not submit", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBookSlot({
      candidateId: "ic-1",
      stageId: "stage-2",
      stageName: "Demo Round",
    });

    await waitFor(() =>
      expect(screen.getByText(/Book Your Demo Round Slot/i)).toBeInTheDocument(),
    );

    const dateTrigger = screen.getByRole("combobox", { name: /Select Date/i });
    await openSelectAndPick(user, dateTrigger, /Today -/i);

    const timeTriggers = screen.getAllByRole("combobox").filter((el) =>
      /Choose time/i.test(el.textContent || ""),
    );
    await openSelectAndPick(user, timeTriggers[0], "10:00 AM");
    await openSelectAndPick(user, timeTriggers[1], "10:00 AM");
    await openSelectAndPick(user, timeTriggers[2], "10:00 AM");

    // Warning shown, submit disabled, no insert happened
    expect(screen.getByText(/Please choose 3 different timings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit 3 Preferred Timings/i })).toBeDisabled();
    expect(slotBookingInserts).toHaveLength(0);
  });
});

describe("BookSlot — error states", () => {
  it("shows the invalid-link card when no candidateId is provided", async () => {
    renderBookSlot({ stageId: "stage-1", stageName: "Technical Assessment" });
    await waitFor(() => expect(screen.getByText(/Invalid Link/i)).toBeInTheDocument());
    expect(screen.getByText(/Missing candidate information/i)).toBeInTheDocument();
  });
});
