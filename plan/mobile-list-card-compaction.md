# Plan: Compact the List tab's mobile course card

## Context
The user shared a screenshot of the current mobile List tab (`components/course-filter/CourseTable.tsx:172-236`,
the `md:hidden` mobile card view). It works, but each card is tall — roughly
230–250px — because the four data points (Time, Room, Faculty, Seats) are
each rendered as their own padded, filled, rounded box in a 2×2 grid, plus a
separate bordered footer row just for the priority stepper. With up to 100
rows rendered, that's a lot of scrolling to get through a course list on a
phone.

Explicit constraint from the user: **no feature may be compromised** — every
piece of information and every control (star, priority stepper, section,
time, room, faculty, seats) must remain visible and usable, just packed more
efficiently. This is a density/layout change, not a scope cut.

## Precedent already in this codebase
`components/course-filter/ScheduleView.tsx` (the Schedule tab's right-sidebar
course list, lines ~1085-1115) already solves almost this exact problem: it
shows courseCode, section, time, faculty, room, and seat (with a color-coded
availability indicator) in a single compact card using small icons
(`FaChalkboardTeacher`, `FaMapMarkerAlt`, `FaChair`) inline with plain text
instead of separate boxed cells — no wasted padding, no per-field
backgrounds. That card is roughly 80-90px tall for the same amount of
information the List tab's mobile card takes ~230px+ to show. This plan
proposes bringing that same visual language to the List tab's mobile card,
which also makes the two tabs feel like one consistent design system instead
of two different card styles for the same underlying data shape.

## Proposed new mobile card layout

Single card, three lines instead of the current title-block + 2×2 grid +
divider + footer:

```
┌─────────────────────────────────────────────┐
│ ACT201  ⓵                              ★     │   ← course code + circular
│                                                │     section badge + star,
│                                                │     one line (was 2 lines
│                                                │     + a separate badge)
│ 🕐 MW 04:20 PM - 05:50 PM      📍 NAC202       │   ← time + room, one line
│ 👤 ARM              💺 38          [-] 0 [+]  │   ← faculty + seats +
└─────────────────────────────────────────────┘     priority stepper, one line
```

Concretely:
- **Line 1**: `courseCode` (bold, `text-body`, was `text-lead`) + a small
  circular section badge (reuse the exact `w-5 h-5 rounded-pill` badge style
  from `ScheduleView.tsx`'s course cards, instead of a separate "Section N"
  text line) + the star button, all in one `flex justify-between` row. This
  removes an entire text line versus today's `<h3>` + `<p>Section N</p>`.
- **Line 2**: time (with a clock icon) on the left, room (with a pin icon,
  `FaMapMarkerAlt`) right-aligned — one row instead of two boxed cells.
- **Line 3**: faculty (with `FaChalkboardTeacher`) on the left, seats (with
  `FaChair`, keep the existing color-coded availability —
  `seatAvailabilityColor`-equivalent logic already exists in
  `ScheduleView.tsx` and should be reused/shared rather than
  reimplemented — see "Shared logic" below) in the middle, and the priority
  stepper compacted to the right of the same row instead of a separate
  bordered footer section.
- Drop the per-field `bg-rule-soft rounded-control px-3 py-2` boxes
  entirely — plain text with icons, matching the Schedule tab card, removes
  most of the vertical padding that's currently the biggest space cost.
- Drop the `border-t border-rule` footer divider — folding the stepper into
  line 3 removes the need for a visually separated section.

Estimated result: ~90-110px per card (a ~55-60% height reduction), with
every field still visible and every control still fully interactive — nothing
moves behind a tap-to-expand or a "show more."

## Component sizing considerations
- The priority stepper currently uses `w-10 h-10` buttons (40px, added in
  the last mobile pass for touch-target size). Folding it into a text row
  means it needs to sit comfortably next to faculty/seat text without
  forcing the row to wrap. Options, in order of preference:
  1. Shrink the stepper buttons slightly (`w-8 h-8`, still ≥ the ~32px
     comfortable minimum for a secondary/less-frequently-tapped control) —
     the star button and section badge stay at their current touch-friendly
     sizes since those are tapped more often.
  2. If line 3 still feels cramped on the narrowest supported width
     (~360px), let the stepper wrap to its own line only below that width
     via a `flex-wrap` on line 3's container — still fewer total lines than
     today in the common case, graceful fallback at the extreme.
- Keep the card's outer `glass rounded-panel` treatment and overall
  card-to-card spacing (`space-y-4` in the list) — this plan is about what's
  *inside* each card, not the list's outer rhythm.

## Shared logic to extract (avoid duplicating seat-color logic)
`ScheduleView.tsx` already has a `seatAvailabilityColor(seat)` helper
(green ≥20, amber 5-19, red <5) used on its own course cards. If the List
tab's mobile card is going to show the same color-coded seat count (a
reasonable enhancement consistent with "effective" information display the
user asked for — the user didn't ask for this specifically, but it's the
same field getting the same treatment elsewhere in the app, so leaving it
plain here while it's colored there would be an inconsistency), that helper
should move to a shared location (e.g. `utils/timeUtils.ts` or a small new
`utils/courseDisplay.ts`) and be imported by both components instead of
copy-pasted. This is a small refactor alongside the layout change, not a
separate task.

## What does NOT change
- Desktop table view (`hidden md:block` table in the same file) — untouched.
- The List tab's `FilterMenu` (search bar, chips) — untouched, this plan is
  scoped to the mobile card body only.
- No data/behavior changes: `toggleStar`, `changePriority`, and all existing
  props/handlers are reused as-is, just re-laid-out.
- The Schedule tab's own cards — already compact, used here only as a
  visual reference, not modified by this plan.

## Verification plan
- Screenshot the new mobile card at 375px width (same viewport used in the
  prior mobile-responsive pass) before/after, confirm:
  - All 6 data points (course, section, time, room, faculty, seats) plus
    both controls (star, priority stepper) are present and legible.
  - No horizontal overflow.
  - Height reduction is real (compare bounding box height of one card
    before vs. after).
- Confirm desktop table view is pixel-identical to before (this plan touches
  only the `md:hidden` block).
