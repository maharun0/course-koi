# Plan: Mobile-Responsive Redesign

## Context
The app currently works on desktop but was never really designed for phone
widths — it mostly relies on Tailwind's default `md:`/`lg:` breakpoints
scattered per-component rather than a deliberate mobile layout. A direct
audit at 375×812 (iPhone-class viewport) via headless-browser screenshots of
`app/page.tsx`, `components/course-filter/CourseTable.tsx`,
`components/course-filter/Sidebar.tsx`, and `components/course-filter/ScheduleView.tsx`
surfaced concrete, specific problems — this plan addresses each of them, not
just "make things smaller."

## Findings (screenshotted, not guessed)

1. **Header/logo is oversized on phones** — [app/page.tsx:150](../app/page.tsx#L150)
   sets the wordmark to a flat `text-4xl` with no smaller mobile variant. At
   375px it wraps ("Course" / "Koi?" stack onto two lines), pushing the
   "Last Updated" line down and eating a large chunk of the very limited
   vertical space before any real content appears.
2. **Schedule tab's weekly grid is unusable on phones** — this is the most
   serious issue. [ScheduleView.tsx:1294](../components/course-filter/ScheduleView.tsx#L1294)
   hard-codes `grid-cols-[80px_repeat(7,minmax(0,1fr))]`: 7 day columns plus
   a time gutter, always. At 375px width each day column renders at roughly
   30–35px — day labels ("Sat" "Sun"...) are barely legible and any actual
   course block placed inside would be far too narrow to show its own text.
   There is currently no mobile-specific view for the schedule grid at all.
3. **List tab's leftover desktop copy** — [CourseTable.tsx:78](../components/course-filter/CourseTable.tsx#L78)
   always renders "Tip: Scroll horizontally for more columns" on mobile,
   but mobile already gets a completely different card-based layout (no
   table, no horizontal scroll) — the tip is simply wrong/dead copy on the
   device it's shown on.
4. **Sidebar drawer is a fixed 256px regardless of viewport** —
   [Sidebar.tsx:168](../components/course-filter/Sidebar.tsx#L168) and
   [Sidebar.tsx:172](../components/course-filter/Sidebar.tsx#L172) both hard-code
   `w-64`. On a 375px phone that's ~68% of the screen, leaving an oddly
   narrow dead strip of backdrop on the right rather than either a
   comfortable wide drawer or an intentional partial reveal.
5. **Schedule tab stacking order** — the course-picker panel and the
   weekly-grid panel are laid out as `flex-col lg:flex-row` with an
   `lg:order-1`/`lg:order-2` flip that only applies at `lg`. Below `lg`
   (i.e. on every phone and most tablets) the picker panel — search bar,
   chips, the full scrollable course list — renders **above** the actual
   schedule grid in document order, so a user has to scroll past the whole
   picker just to see their schedule.
6. **Side padding regression just fixed, but the underlying pattern is
   fragile** — the List tab's side padding (`app/page.tsx` lines ~207/226)
   was recently bumped to `px-8 md:px-24 lg:px-32 xl:px-40` for desktop
   breathing room, then walked back to `px-2 sm:px-4 md:px-16...` for
   mobile. This plan should fold that into a single deliberate spacing
   scale rather than continuing to hand-tune it reactively.
7. **Touch targets** — several icon-only buttons (schedule toolbar icons,
   the my-courses chip row, the priority stepper's `-`/`+` buttons) are
   sized for mouse precision (~28-32px), under the ~44px minimum comfortable
   touch target size.

## Design approach

### 1. Header — a real mobile layout, not a shrunk desktop one
- Wordmark: `text-2xl sm:text-3xl lg:text-4xl` — a proper responsive scale
  instead of one fixed size that happens to wrap badly.
- On mobile, drop the "Last Updated" line to a smaller `text-[10px]`/`text-micro`
  size and consider truncating it (e.g. just the date, not the full
  timestamp) since it's secondary information competing for very little
  vertical space.
- Collapse the header to a single row on mobile: hamburger + small logo
  mark (no full wordmark, or an abbreviated "CK" mark) + the List/Schedule
  toggle, with "Star on GitHub" hidden below `sm` (it's already
  `hidden md:flex`, keep that). The goal is one compact ~56px header row on
  phones instead of the current two-line, ~140px block.

### 2. Schedule tab — mobile needs its own view, not a shrunk grid
This is the core problem and deserves the most design attention. Recommend:
- **Day-switcher agenda view below a breakpoint (e.g. `< md`)**: instead of
  rendering all 7 day columns at once, show one day at a time with a
  horizontal day-pill switcher (Sat/Sun/Mon/.../Fri) above a single-column
  vertical timeline for the selected day. This reuses the exact same
  `daySchedules` data already computed in `ScheduleView.tsx` — just render
  `daySchedules[selectedDay]` instead of mapping over all `DAYS`.
- Default the switcher to today's day-of-week on load (falls back to the
  first day with any scheduled item if today has none) — this is a small,
  genuinely useful touch, not scope creep, since it directly answers "what
  do I have today."
- Course blocks in the single-day view can afford to be taller/roomier
  (full-width instead of 1/7th-width), so faculty/room/time can all be
  shown without truncation — actually an improvement over the desktop grid
  for that view, not just a compromise.
- Keep the existing 7-column grid as-is for `md:` and above — no desktop
  regression.

### 3. List tab
- Remove the "Tip: Scroll horizontally for more columns" copy entirely on
  mobile (it's already inside a `md:hidden` block meant for mobile only —
  the fix is to delete the tip, not adjust a breakpoint, since the mobile
  card layout never has horizontal table scroll to hint at).
- Priority stepper: the mobile card currently shows only a bare number
  input (`CourseTable.tsx` mobile section) while desktop gets full `-`/`+`
  stepper buttons. Bring the same stepper control to mobile cards for
  consistency and so the touch target is a button, not a tiny numeric input
  needing the OS keyboard.
- Fold the padding fix already applied into a named scale (see §5) instead
  of an ad hoc `px-2 sm:px-4 md:px-16 lg:px-24 xl:px-40` string repeated in
  two places.

### 4. Sidebar drawer
- Change the fixed `w-64` to something viewport-relative on small screens:
  e.g. `w-[85vw] max-w-64` (or `w-full max-w-xs`) below `sm`, reverting to
  the current fixed `w-64` at `sm:` and above. A drawer should either
  comfortably fill most of a phone screen or be a deliberate peek — 256px
  on a 375px screen is neither.
- Verify the backdrop's `bg-scrim/40` still reads correctly at the new
  width (no change expected, just confirm after the resize).

### 5. Spacing scale — replace ad hoc padding with named steps
Introduce one small set of responsive padding tokens applied consistently
(not just to the List tab) rather than hand-tuning `px-*` strings per
request:
```
--content-padding-mobile:  8px   (px-2)
--content-padding-tablet:  16px  (sm:px-4)
--content-padding-desktop: 64px  (md:px-16)
--content-padding-wide:    96px  (lg:px-24)
--content-padding-ultra:   128px (xl:px-32)
```
These map directly to the classes already applied
(`px-2 sm:px-4 md:px-16 lg:px-24 xl:px-32`) — the only change is naming
them once (e.g. as a Tailwind `@theme` `--spacing-content-*` set, or a
shared constant) so future "more/less space" requests have one place to
tune instead of two duplicated class strings.

### 6. Touch targets
- Audit all icon-only buttons below `md` and ensure a minimum 40×40px hit
  area (can keep the visual icon small while padding the hit area — e.g.
  `p-2.5` minimum rather than `p-1`/`p-0.5` on mobile).
- Specifically: schedule toolbar buttons, the my-courses star toggle added
  earlier, the priority stepper buttons once brought to mobile per §3.

## Sequencing (suggested implementation order)
1. Header responsive scale (§1) — quick, high-visibility win, no logic
   changes.
2. List tab mobile copy fix + stepper parity (§3) — small, isolated.
3. Sidebar drawer width (§4) — small, isolated, no data/logic changes.
4. Spacing token cleanup (§5) — mechanical, do alongside whichever section
   is touched first so it doesn't need a separate pass.
5. Schedule tab day-switcher (§2) — the biggest single piece of work
   (new state: `selectedDay`, new pill-switcher UI, conditional render
   path for `< md`), do last since it's the most involved and most worth
   getting right rather than rushing.
6. Touch target pass (§6) — sweep once the above are in, since some hit
   areas will already be touched by the header/toolbar work in steps 1–2.

## Out of scope for this pass
- No changes to desktop (`md:` and above) behavior for any of the above
  except where explicitly noted (spacing token naming touches desktop
  classes too, but produces identical values).
- No new features (this is layout/responsiveness only, matching the
  pattern of prior "pure visual pass" requests in this project).
- Landscape-phone-specific tuning — treat portrait phone widths (~360–430px)
  as the primary target; landscape phones will fall into the `sm:`/`md:`
  breakpoints already and can be revisited if they look wrong in practice.
