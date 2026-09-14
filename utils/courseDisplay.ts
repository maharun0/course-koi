// Seat availability signal: genuinely useful for registration, not decorative.
// Shared between ScheduleView's course cards and the List tab's mobile
// course cards so both show the same color-coded meaning.
export function seatAvailabilityColor(seat: number | undefined): string {
  if (seat === undefined) return 'text-ink-3';
  if (seat >= 20) return 'text-ok';
  if (seat >= 5) return 'text-warn';
  return 'text-bad';
}
