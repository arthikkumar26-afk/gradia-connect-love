import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatDateValue,
  getNextAvailableSlot,
  getTimeSlots,
} from "./timeSlots";

describe("getTimeSlots — 24-hour availability", () => {
  it("returns 48 slots at 30-min granularity covering 00:00 → 23:30", () => {
    const slots = getTimeSlots(30, "all");
    expect(slots).toHaveLength(48);
    expect(slots[0].value).toBe("00:00");
    expect(slots[slots.length - 1].value).toBe("23:30");
  });

  it("returns 96 slots at 15-min granularity covering 00:00 → 23:45", () => {
    const slots = getTimeSlots(15, "all");
    expect(slots).toHaveLength(96);
    expect(slots[0].value).toBe("00:00");
    expect(slots[slots.length - 1].value).toBe("23:45");
  });

  it("includes every hour of the day at least once (no gaps)", () => {
    const slots = getTimeSlots(30, "all");
    const hoursSeen = new Set(slots.map((s) => s.value.slice(0, 2)));
    for (let h = 0; h < 24; h++) {
      expect(hoursSeen.has(h.toString().padStart(2, "0"))).toBe(true);
    }
  });

  it("never produces an out-of-range value (00:00 ≤ time ≤ 23:45)", () => {
    for (const granularity of [15, 30] as const) {
      const slots = getTimeSlots(granularity, "all");
      for (const slot of slots) {
        const [h, m] = slot.value.split(":").map(Number);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(45);
      }
    }
  });

  it("formats labels with 12-hour clock + AM/PM", () => {
    const slots = getTimeSlots(30, "all");
    expect(slots.find((s) => s.value === "00:00")?.label).toBe("12:00 AM");
    expect(slots.find((s) => s.value === "12:00")?.label).toBe("12:00 PM");
    expect(slots.find((s) => s.value === "23:30")?.label).toBe("11:30 PM");
    expect(slots.find((s) => s.value === "09:30")?.label).toBe("9:30 AM");
  });
});

describe("getTimeSlots — period filters", () => {
  it("morning covers 00:00 → 11:30 only", () => {
    const slots = getTimeSlots(30, "morning");
    expect(slots[0].value).toBe("00:00");
    expect(slots[slots.length - 1].value).toBe("11:30");
    expect(slots.every((s) => Number(s.value.slice(0, 2)) < 12)).toBe(true);
  });

  it("afternoon covers 12:00 → 16:30 only", () => {
    const slots = getTimeSlots(30, "afternoon");
    expect(slots[0].value).toBe("12:00");
    expect(slots[slots.length - 1].value).toBe("16:30");
    expect(
      slots.every((s) => {
        const h = Number(s.value.slice(0, 2));
        return h >= 12 && h < 17;
      }),
    ).toBe(true);
  });

  it("evening covers 17:00 → 23:30 only", () => {
    const slots = getTimeSlots(30, "evening");
    expect(slots[0].value).toBe("17:00");
    expect(slots[slots.length - 1].value).toBe("23:30");
    expect(slots.every((s) => Number(s.value.slice(0, 2)) >= 17)).toBe(true);
  });

  it("morning + afternoon + evening = full day count", () => {
    expect(
      getTimeSlots(30, "morning").length +
        getTimeSlots(30, "afternoon").length +
        getTimeSlots(30, "evening").length,
    ).toBe(getTimeSlots(30, "all").length);
  });
});

describe("getNextAvailableSlot — Start Now / Next 10 mins", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validSlot = (time: string, granularity: 15 | 30) => {
    const allSlots = getTimeSlots(granularity, "all").map((s) => s.value);
    return allSlots.includes(time);
  };

  it("midday: rounds up to the next 30-min slot", () => {
    vi.setSystemTime(new Date("2026-04-24T10:17:00"));
    const slot = getNextAvailableSlot(30);
    expect(slot.time).toBe("10:30");
    expect(slot.date).toBe("2026-04-24");
    expect(validSlot(slot.time, 30)).toBe(true);
  });

  it("just past the half hour: jumps to the next hour", () => {
    vi.setSystemTime(new Date("2026-04-24T10:25:00"));
    const slot = getNextAvailableSlot(30);
    expect(slot.time).toBe("11:00");
    expect(validSlot(slot.time, 30)).toBe(true);
  });

  it("very early morning (02:13) still returns a same-day slot, not 09:00", () => {
    vi.setSystemTime(new Date("2026-04-24T02:13:00"));
    const slot = getNextAvailableSlot(30);
    expect(slot.time).toBe("02:30");
    expect(slot.date).toBe("2026-04-24");
    expect(validSlot(slot.time, 30)).toBe(true);
  });

  it("late evening (22:55) still returns a same-day slot, not 09:00", () => {
    vi.setSystemTime(new Date("2026-04-24T22:55:00"));
    const slot = getNextAvailableSlot(30);
    expect(slot.time).toBe("23:30");
    expect(slot.date).toBe("2026-04-24");
    expect(validSlot(slot.time, 30)).toBe(true);
  });

  it("near midnight (23:55) rolls into the next day", () => {
    vi.setSystemTime(new Date("2026-04-24T23:55:00"));
    const slot = getNextAvailableSlot(30);
    // 23:55 + 10min buffer → 00:05 next day → rounded up to 00:30
    expect(slot.time).toBe("00:30");
    expect(slot.date).toBe("2026-04-25");
    expect(validSlot(slot.time, 30)).toBe(true);
  });

  it("supports 15-min granularity", () => {
    vi.setSystemTime(new Date("2026-04-24T14:03:00"));
    const slot = getNextAvailableSlot(15);
    expect(slot.time).toBe("14:15");
    expect(validSlot(slot.time, 15)).toBe(true);
  });

  it("never returns a value outside the 00:00–23:45 range across the day", () => {
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of [0, 7, 14, 29, 31, 45, 59]) {
        vi.setSystemTime(new Date(2026, 3, 24, hour, minute, 0));
        const slot = getNextAvailableSlot(30);
        const [h, m] = slot.time.split(":").map(Number);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(23);
        expect([0, 30]).toContain(m);
      }
    }
  });
});

describe("formatDateValue", () => {
  it("formats as YYYY-MM-DD using local time (not UTC)", () => {
    const date = new Date(2026, 0, 5); // Jan 5 local
    expect(formatDateValue(date)).toBe("2026-01-05");
  });
});
