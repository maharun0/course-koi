export interface TimeSlot {
  day: string;
  start: number; // minutes from 00:00
  end: number;   // minutes from 00:00
}

export interface ParsedSchedule {
  courseId: string;
  courseCode: string; // Add courseCode for error messages
  section: string;
  slots: TimeSlot[];
}

const DaysMap: Record<string, string> = {
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  R: 'Thu',
  F: 'Fri',
  A: 'Sat',
  S: 'Sun',
};

// Map full day names to 0-6 index for fullcalendar or similar if needed
export const DayToIndex: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 0,
};

/**
 * Parses a time string like "MW 10:00 AM - 11:30 AM" into a structured format.
 * Handles multiple days and time ranges with AM/PM.
 * Assumes format: "[Days] [Start Time] - [End Time]"
 */
export function parseCourseTime(timeStr: string, courseId: string, courseCode: string, section: string): ParsedSchedule | null {
  if (!timeStr || timeStr === 'TBA') return null;

  try {
    // 1. Separate Days part from Time Range part
    // Regex matches the first digit to split days from time
    // e.g. "TR 08:00 AM - 09:30 AM"
    const match = timeStr.match(/^([A-Z]+)\s+(.*)$/);
    if (!match) return null;

    const daysPart = match[1];
    const timeRange = match[2];

    const days: string[] = [];
    // Iterate 1 char at a time
    for (const char of daysPart) {
      if (DaysMap[char]) {
        days.push(DaysMap[char]);
      }
    }

    // 2. Parse Start and End Times including AM/PM
    const [startStr, endStr] = timeRange.split('-').map(s => s.trim());

    const parseTime = (t: string) => {
      // t is like "08:00 AM" or "02:30 PM"
      const [time, modifier] = t.split(' ');
      let [h, m] = time.split(':').map(Number);

      if (modifier === 'PM' && h !== 12) {
        h += 12;
      }
      if (modifier === 'AM' && h === 12) {
        h = 0;
      }

      return h * 60 + m;
    };

    const start = parseTime(startStr);
    const end = parseTime(endStr);


    const slots: TimeSlot[] = days.map((day) => ({
      day,
      start,
      end,
    }));

    return {
      courseId,
      courseCode,
      section,
      slots,
    };
  } catch (e) {
    console.error('Failed to parse time:', timeStr, e);
    return null;
  }
}

/**
 * Checks for conflicts between selected courses.
 * Returns a list of conflicting pairs messages.
 */
export function detectConflicts(schedules: ParsedSchedule[]): string[] {
  const conflicts: string[] = [];

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const s1 = schedules[i];
      const s2 = schedules[j];

      // Check if they share any time slots
      for (const slot1 of s1.slots) {
        for (const slot2 of s2.slots) {
          if (slot1.day === slot2.day) {
            // Check overlaps
            if (Math.max(slot1.start, slot2.start) < Math.min(slot1.end, slot2.end)) {
              conflicts.push(`${s1.courseCode} (Sec ${s1.section}) conflicts with ${s2.courseCode} (Sec ${s2.section}) on ${slot1.day}`);
            }
          }
        }
      }
    }
  }

  return [...new Set(conflicts)]; // Unique messages
}
