// Seat availability signal: genuinely useful for registration, not decorative.
// Shared between ScheduleView's course cards and the List tab's mobile
// course cards so both show the same color-coded meaning.
export function seatAvailabilityColor(seat: number | undefined): string {
  if (seat === undefined) return 'text-ink-3';
  if (seat >= 20) return 'text-ok';
  if (seat >= 5) return 'text-warn';
  return 'text-bad';
}

/**
 * Compact form of the sync timestamp for the navbar status chip, keeping the
 * exact minute: "14 September 2026, 11:46 AM" -> "14 Sep, 11:46 AM".
 * Only the year is dropped (the full string stays in the tooltip). Falls back
 * to the original string if the format ever changes, so a sync-script change
 * can't break the navbar.
 */
export function shortUpdatedLabel(lastUpdated: string | null | undefined): string {
  if (!lastUpdated) return '—';
  const [datePart, timePart] = lastUpdated.trim().split(/,\s*/);
  if (!datePart || !timePart) return lastUpdated;
  const [day, month] = datePart.split(/\s+/);
  if (!day || !month || !/^\d{1,2}$/.test(day)) return lastUpdated;
  return `${day} ${month.slice(0, 3)}, ${timePart}`;
}
