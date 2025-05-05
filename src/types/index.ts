import type { Timestamp } from "firebase/firestore";

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string; // Added client email
  date: Timestamp; // Use Firestore Timestamp
  time: string; // e.g., "09:00"
  createdAt: Timestamp;
}

export interface Availability {
  id: string; // YYYY-MM-DD
  blockedTimes: string[]; // e.g., ["09:00", "14:30"]
  // workingHours could be stored elsewhere or defaulted
}

// Default working hours and slot interval
export const defaultWorkingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
export const slotIntervalMinutes = 30;
