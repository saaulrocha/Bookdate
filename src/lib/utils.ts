import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMinutes, format, setHours, setMinutes, startOfDay } from "date-fns";
import type { Appointment, Availability } from "@/types";
import { defaultWorkingHours, slotIntervalMinutes } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates time slots within working hours based on a specified interval.
 * @param intervalMinutes The interval between slots in minutes.
 * @param workingHours The start and end hours of the working day.
 * @returns An array of time slots in "HH:mm" format.
 */
export function generateTimeSlots(
  intervalMinutes: number = slotIntervalMinutes,
  workingHours: { start: number; end: number } = defaultWorkingHours
): string[] {
  const slots: string[] = [];
  const start = setMinutes(setHours(startOfDay(new Date()), workingHours.start), 0);
  const end = setMinutes(setHours(startOfDay(new Date()), workingHours.end), 0);
  let current = start;

  while (current < end) {
    slots.push(format(current, "HH:mm"));
    current = addMinutes(current, intervalMinutes);
  }

  return slots;
}

/**
 * Filters available time slots based on existing appointments and blocked times.
 * @param allSlots All possible time slots for the day.
 * @param appointments List of appointments for the day.
 * * @param availability Availability data for the day (blocked times).
 * @returns An array of available time slots.
 */
export function getAvailableSlots(
  allSlots: string[],
  appointments: Appointment[] = [],
  availability?: Availability
): string[] {
    const bookedTimes = new Set(appointments.map(app => app.time));
    const blockedTimes = new Set(availability?.blockedTimes || []);

    return allSlots.filter(slot => !bookedTimes.has(slot) && !blockedTimes.has(slot));
}

/**
 * Formats a time string (HH:mm) into a display format (e.g., HH:mm AM/PM).
 * @param timeString The time string in "HH:mm" format.
 * @returns Formatted time string.
 */
export function formatDisplayTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = setMinutes(setHours(new Date(), hours), minutes);
  return format(date, "hh:mm a"); // e.g., 09:00 AM
}
