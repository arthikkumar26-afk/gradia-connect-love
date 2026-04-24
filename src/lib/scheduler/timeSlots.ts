export type TimeOfDay = "all" | "morning" | "afternoon" | "evening";
export type Granularity = 15 | 30;

export interface TimeSlot {
  value: string;
  label: string;
}

export const formatDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Generates booking time slots covering the full 24-hour day.
 * - 30-min granularity → 48 slots (00:00 … 23:30)
 * - 15-min granularity → 96 slots (00:00 … 23:45)
 * Period filter uses morning <12, afternoon 12-17, evening 17-24.
 */
export const getTimeSlots = (
  granularityMin: Granularity = 30,
  period: TimeOfDay = "all",
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const minuteSteps = granularityMin === 15 ? ["00", "15", "30", "45"] : ["00", "30"];

  for (let hour = 0; hour < 24; hour++) {
    for (const minute of minuteSteps) {
      if (period === "morning" && hour >= 12) continue;
      if (period === "afternoon" && (hour < 12 || hour >= 17)) continue;
      if (period === "evening" && hour < 17) continue;

      const time = `${hour.toString().padStart(2, "0")}:${minute}`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      slots.push({
        value: time,
        label: `${displayHour}:${minute} ${ampm}`,
      });
    }
  }
  return slots;
};

/**
 * Returns the next bookable date+time slot, rounded up to the granularity.
 * Always returns a valid slot inside the 24-hour day, rolling over to the
 * next day if rounding pushes past midnight.
 */
export const getNextAvailableSlot = (
  stepMinutes: Granularity = 30,
  now: Date = new Date(),
): { date: string; time: string } => {
  const target = new Date(now);
  target.setMinutes(target.getMinutes() + 10);
  target.setSeconds(0, 0);

  const totalMinutes = target.getHours() * 60 + target.getMinutes();
  const roundedTotalMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;

  const slot = new Date(target);
  slot.setHours(0, 0, 0, 0);
  slot.setMinutes(roundedTotalMinutes);

  return {
    date: formatDateValue(slot),
    time: `${slot.getHours().toString().padStart(2, "0")}:${slot
      .getMinutes()
      .toString()
      .padStart(2, "0")}`,
  };
};
