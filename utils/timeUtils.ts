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
  Mo: 'Mon',
  Tu: 'Tue',
  We: 'Wed',
  Th: 'Thu',
  Fr: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
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
 * Parses a time string like "MoWe 10:00-11:30" into a structured format.
 * Handles multiple days and time ranges.
 * Assumes format: "DayDay... HH:MM-HH:MM"
 */
export function parseCourseTime(timeStr: string, courseId: string, courseCode: string, section: string): ParsedSchedule | null {
  if (!timeStr || timeStr === 'TBA') return null;

  try {
    const [daysPart, timeRange] = timeStr.split(' ');
    if (!daysPart || !timeRange) return null;

    const days: string[] = [];
    // Split day string every 2 chars (e.g., "MoWe" -> ["Mo", "We"])
    for (let i = 0; i < daysPart.length; i += 2) {
      const d = daysPart.substring(i, i + 2);
      if (DaysMap[d]) {
        days.push(DaysMap[d]);
      }
    }

    const [startStr, endStr] = timeRange.split('-');
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
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
