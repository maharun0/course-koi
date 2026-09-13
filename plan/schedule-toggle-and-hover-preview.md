# Plan: Schedule-tab course filter toggle + hover preview

## Scope
Two features inside the **Schedule tab**'s left sidebar
([components/course-filter/ScheduleView.tsx](../components/course-filter/ScheduleView.tsx)),
specifically the "Courses" sub-tab (as opposed to the "Custom" sub-tab):

1. A single icon-only button, next to the course search bar, that cycles
   through 3 states and changes which course list is displayed.
2. Hovering a course/section in that list shows a dashed-outline preview of
   where it would land in the weekly grid on the right — reusing the dashed
   preview mechanism that already exists for custom events.

## Current state (for reference)
- `ScheduleView` receives two props from [app/page.tsx:232](../app/page.tsx#L232):
  `courses` (= `starredCourses`) and `allCourses` (= `sortedData`, i.e. all
  rows after list-tab filters/sort). It does **not** currently receive
  `savedCourses` ("My Courses" — the course codes added via the Sidebar's
  add-course box), so that needs to be threaded through.
- `displayedCourses` (ScheduleView.tsx:846-875) currently hard-codes the
  behavior: no search term → show only `courses` (starred); search term
  present → search across `allCourses`, starred matches first. There's no
  persistent "all" or "my courses" mode today — this is exactly the gap the
  new toggle fills.
- The dashed/dotted preview pattern already exists for the Custom-event tab:
  `previewCourse` (ScheduleView.tsx:416-442) builds a fake `CourseRow` from
  the in-progress custom event form, and `daySchedules` (ScheduleView.tsx:444
  onward) appends it to the render list with `isPreview: true`, which the
  render code (ScheduleView.tsx:1262-1263) styles as
  `opacity-50 border-dashed border-white/40 pointer-events-none`. The new
  hover preview reuses this exact mechanism instead of inventing a new one.

## Part 1 — 3-state filter button

### State model
Add one new piece of state in `ScheduleView`:
```ts
const [courseListMode, setCourseListMode] = useState<'starred' | 'all' | 'mine'>('starred');
```
`'starred'` as the default preserves today's behavior (panel opens showing
starred sections, matching the existing comment "the whole point of this
panel").

### Cycling button
- Placed to the right of the existing search input at ScheduleView.tsx:983-999
  (same flex row, `gap-2` between input and button).
- One `<button>`, `onClick` advances `courseListMode` through
  `starred → all → mine → starred`.
- Icon-only (no label) to stay compact per the request — reuse `react-icons/fa`
  already imported in this file:
  - `starred` → `FaStar` (yellow tint, matches the star metaphor used
    elsewhere, e.g. Sidebar.tsx:305)
  - `all` → `FaLayerGroup` (already used for "All Courses" in Sidebar.tsx:194)
  - `mine` → `FaBook` (already imported/used for the "Course Added" toast in
    Sidebar.tsx:323, so it's a familiar icon in this codebase for "my
    courses")
- `title` attribute set to the *current* state's label ("Showing starred
  sections" / "Showing all sections" / "Showing my courses") for
  accessibility/discoverability, since there's no text label.

### Filtering logic changes
Thread `savedCourses: CourseRow[]` into `ScheduleView` as a new prop (passed
from `app/page.tsx:232`, `<ScheduleView courses={starredCourses}
allCourses={sortedData} savedCourses={savedCourses} />` — `savedCourses` is
already available in `page.tsx` from `useCourseData()`,
[hooks/useCourseData.ts](../hooks/useCourseData.ts)).

Rewrite `displayedCourses` (ScheduleView.tsx:846-875) to:
1. Pick a **base list** from `courseListMode`:
   - `'starred'` → `courses` (unchanged behavior)
   - `'all'` → `allCourses`
   - `'mine'` → `allCourses.filter(c => savedCourseCodes.has(c.courseCode))`,
     where `savedCourseCodes = new Set(savedCourses.map(c => c.courseCode))`
     (memoized alongside)
2. If `searchTerm` is empty, return the base list as-is.
3. If `searchTerm` is present, filter the **base list** (not always
   `allCourses` like today) by courseCode/section substring match — this
   makes search scoped to whichever mode is active, which is more predictable
   than the current "search always escapes to global scope" behavior.
4. Drop the "starred matches first" partitioning special-case (ScheduleView.tsx
   856-871) since it was a workaround for there being no explicit "all" mode;
   with an explicit `all` mode selectable via the button it's no longer
   needed. Keep the `.slice(0, 50)` cap for render performance.

## Part 2 — Hover dashed-preview in the grid

### State
Add:
```ts
const [hoveredCourse, setHoveredCourse] = useState<CourseRow | null>(null);
```

### Wiring
On each course button in the list (ScheduleView.tsx:1005-1025), add:
- `onMouseEnter={() => setHoveredCourse(course)}`
- `onMouseLeave={() => setHoveredCourse(null)}`

Skip setting hover preview when the course is already selected (`isSelected`
true) — it's already rendered solid in the grid, a dashed overlay would be
redundant/confusing.

### Rendering
Extend the `coursesToRender` composition in `daySchedules`
(ScheduleView.tsx:462-466) to also push `hoveredCourse` (when set and not
already in `selectedCourses`) alongside the existing `previewCourse` push,
tagging it the same way (`isPreview: true` via the existing `isPreview =
course.id === 'preview-custom'` check — extend that check to
`course.id === 'preview-custom' || course.id === hoveredCourse?.id`, or more
robustly, add an explicit second marker id like `'preview-hover'` cloned onto
a shallow copy of the hovered course so the existing id-based `isPreview`
check keeps working without touching unrelated logic).

Reuse `parseCourseTime` exactly as `previewCourse` handling does (ScheduleView.tsx
470) — no new time-parsing logic needed since `CourseRow.time` is already in
the same string format for both starred/all/mine list items and custom
events.

Color: reuse the existing preview override `if (isPreview) color =
'bg-gray-500';` (ScheduleView.tsx:488) so hovered-section previews render with
the same dashed gray box as custom-event previews — visually distinct from
committed schedule blocks, consistent styling with zero new CSS.

### Edge cases to handle
- **Conflict with an existing selection**: if hovering a section that would
  clash with something already on the schedule, still show the dashed
  preview (informational only, doesn't need conflict detection — the actual
  `handleCourseSelect` conflict check still runs and blocks the real add on
  click, so a hover preview overlapping an existing block is an acceptable,
  informative signal, not a bug).
- **Rapid hover across list while scrolling**: since `hoveredCourse` is a
  single piece of state set on mouse enter/leave, no debouncing needed —
  this matches how `hoverState` (gap-detection hover, ScheduleView.tsx:87) is
  already handled elsewhere in this file, so it's consistent with existing
  patterns.
- **Mobile/touch**: hover previews are a mouse-only affordance; no touch
  equivalent is in scope for this feature (matches the fact that drag-resize
  in this component is already mouse-event-only, not touch-event-only).

## Files touched
- [app/page.tsx](../app/page.tsx) — pass `savedCourses` prop to `<ScheduleView>`.
- [components/course-filter/ScheduleView.tsx](../components/course-filter/ScheduleView.tsx) —
  new `courseListMode` + `hoveredCourse` state, updated `displayedCourses`
  memo, updated `daySchedules` memo, new toggle button in the JSX, hover
  handlers on list item buttons.

## Out of scope
- No changes to the List-tab's existing `view`/`starred` toggle in
  `Sidebar.tsx` / `useFiltering.ts` — that's a separate, already-working
  mechanism for a different tab.
- No new persisted preference for which `courseListMode` was last selected
  (resets to `'starred'` on reload) unless requested later.
