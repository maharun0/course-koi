# Plan: Sidebar overhaul — hidden toggle, simpler UI, and the real lag fix

## Summary of what was actually measured

Before designing anything I profiled the running app with a headless browser at
both 375×812 and 1400×900. The numbers matter, because **the lag is not caused
by the sidebar's course list** — that was a reasonable guess, but the data says
otherwise:

| Measurement | Value |
|---|---|
| Total DOM nodes on the page | **96,242** |
| Nodes belonging to the List tab's **mobile card list** | **93,744 (97.4%)** |
| Mobile cards rendered | **3,348** (every section, uncapped) |
| Nodes in the desktop table (capped at 100 rows) | 2,035 |
| Nodes in the **entire sidebar** | **235** |
| `<svg>` icons on page | 16,917 |
| `<button>` elements on page | 10,418 |
| Long tasks during one sidebar open/close (desktop) | **1,790 ms + 2,110 ms** |
| Long tasks during one sidebar open/close (mobile) | 1,450 ms + 950 ms |

So: the sidebar holds 235 nodes. The thing making every toggle block the main
thread for ~2 seconds is a 93,744-node list sitting next to it, which React has
to reconcile on every single state change in `CourseKoiApp`.

## Root causes (three separate problems)

### A. The hamburger is covered when the drawer opens
Measured: the hamburger button occupies `x 8–48, y 20–60`. The open drawer is
`fixed left-2 top-2 bottom-2` starting at `x = 8` with `z-index: 40`
([Sidebar.tsx:168](../components/course-filter/Sidebar.tsx#L168)), while the
header that contains the hamburger is `z-20`
([page.tsx:137](../app/page.tsx#L137)). The drawer therefore lands exactly on
top of the only control that closes it. Backdrop-click still works, so it is
not a dead end — but the button visibly disappears, which reads as a bug.

### B. The sidebar tries to be four things at once
Current contents, top to bottom: brand header → "All Courses" button → "My
Courses" drag-and-drop list → search input → a second always-visible list of 50
available courses → "Starred Sections" → "Reset Priorities". That is two
scrolling lists stacked in one 256px column, each with its own bordered
container, plus three navigation actions competing for the same space. Nothing
here is broken, but the density is why it feels heavy.

### C. The lag — 97% of the DOM is one uncapped list
Two compounding issues:

1. **The mobile card list is uncapped.** The desktop table caps rendering at
   100 rows ([CourseTable.tsx:98](../components/course-filter/CourseTable.tsx#L98),
   with an existing "Showing first 100 of N" note), but the mobile card list
   maps the full `sortedData`
   ([CourseTable.tsx:179-180](../components/course-filter/CourseTable.tsx#L179))
   — 3,348 cards × ~28 nodes.
2. **Both breakpoint views are always mounted.** `hidden md:block` /
   `md:hidden` are CSS-only. At 1400px the mobile card list is invisible but
   still fully mounted, reconciled, and counted in the DOM — which is why the
   desktop numbers are identical to mobile, and why desktop long tasks are
   *worse* (1,790/2,110 ms) than mobile.
3. **Sidebar state lives at the top of the tree.** `sidebarCollapsed` is
   `useState` in `CourseKoiApp` ([page.tsx:62](../app/page.tsx#L62)), and
   nothing below is memoized (no `React.memo` anywhere in
   `components/course-filter/`). Every toggle re-renders `CourseTable` and
   `ScheduleView` in full.

Fixing only #3 would still leave a 96k-node document. Fixing only #1/#2 would
still re-reconcile whatever remains on every toggle. All three should be done.

## The fix

### 1. Cap and isolate the heavy list (the actual performance work)

- **Cap the mobile card list** the same way the desktop table already is.
  Reuse the existing pattern and copy: render `sortedData.slice(0, 100)` and
  show the same "Showing first 100 of N — use search/filters" footer the table
  shows. This alone removes ~90,000 nodes.
- **Render only the active breakpoint's view.** Replace the CSS-only
  `hidden md:block` / `md:hidden` pair with a single `useMediaQuery('(min-width: 768px)')`
  hook so exactly one of table/cards is mounted. Initialize from
  `window.matchMedia` inside `useEffect` (default to the desktop branch for the
  server render) so there is no hydration mismatch. This removes the entire
  inactive branch from the DOM instead of just hiding it.
- **Consider windowing later, not now.** With a 100-row cap the list is ~2.8k
  nodes, which is comfortably fast; introducing a virtualization dependency
  would be premature. Revisit only if the cap is ever lifted.

### 2. Stop the toggle from re-rendering the world

- Wrap `CourseTable` and `ScheduleView` in `React.memo`. Their props are
  already stable arrays/callbacks from hooks, with two exceptions to fix while
  we are here: `toggleStar` and `changePriority` are recreated every render in
  `CourseKoiApp` — wrap both in `useCallback` so memoization actually holds.
- With that in place, `setSidebarCollapsed` re-renders only the header and the
  sidebar (235 nodes), not the list. Expected result: toggle long tasks drop
  from ~2,000 ms to sub-frame.
- Only if the above is somehow not enough: lift `sidebarCollapsed` into a
  tiny context so the header/sidebar subscribe to it directly. Do not start
  here — `React.memo` + `useCallback` is the smaller change and should be
  sufficient. Measure before adding a context.

### 3. Fix the covered hamburger

Preferred: **give the drawer its own close control** rather than fighting the
z-index. A drawer that you close from inside is the conventional pattern, and
it removes the overlap question entirely.
- Add an `×` close button to the drawer's own header row, replacing the
  decorative `FaLayerGroup` badge (which currently does nothing).
- Keep backdrop-click-to-close (already works).
- Add `Escape` to close — cheap, expected, and currently missing.
- Leave the header hamburger as open-only; when the drawer is open it is
  behind the panel, which is now fine because it is no longer the only way out.

Rejected alternative: raising the hamburger to `z-50`. It would then float on
top of the drawer panel, which looks like a rendering mistake and puts two
competing close affordances 40px apart.

### 4. Simplify the sidebar to one list

Collapse the two stacked lists into a single context-sensitive one:

```
┌──────────────────────────────┐
│ Courses                   ×  │  ← title + close (replaces the dead badge)
├──────────────────────────────┤
│ 🔍 Search or add a course…   │  ← the one input, moves to the top
├──────────────────────────────┤
│  (empty search)              │
│   My courses                 │  ← saved list, drag to reorder (kept)
│   • ACT201              ×    │
│   • ARC271              ×    │
│                              │
│  (typing "act")              │
│   + ACT201                   │  ← search results replace the list in place
│   + ACT202                   │
├──────────────────────────────┤
│ ★ Starred sections           │  ← footer nav, unchanged
│ 🗑 Reset priorities           │
└──────────────────────────────┘
```

- **One list, two states.** Empty search → "My courses" (draggable, removable).
  Typing → matching courses to add. This is exactly what the Schedule tab's
  sidebar already does, so it is a pattern already in the app, not a new one.
- **Search moves to the top**, directly under the title, where a search field
  is expected — instead of being buried between two lists.
- **"All Courses" button folds into the list header** as a "Show all" row (or
  is dropped if the ALL chip in the List tab already covers it — check before
  removing; the chip added earlier may make this button redundant).
- **Nothing is removed**: add, remove, reorder, jump-to-course, starred
  sections, and reset priorities all stay. Only the two-lists-at-once layout
  goes away.

## Sequencing

1. Cap the mobile card list (§1) — one-line change, removes ~90k nodes.
2. Mount only the active breakpoint (§1) — needs the small `useMediaQuery` hook.
3. `useCallback` + `React.memo` (§2) — makes toggles cheap.
4. **Re-measure** long tasks and node count; confirm before continuing.
5. Drawer close button + Escape (§3).
6. Sidebar simplification (§4) — the largest UI change, done last so the
   performance work is already verified underneath it.

## Verification (must re-run the same profile, not eyeball it)

Re-run the profiling script used above and require:
- Total DOM nodes: **< 10,000** (from 96,242).
- Longest task during a sidebar open/close: **< 50 ms** (from ~2,000 ms).
- Sidebar opens/closes at 60fps on a 4× CPU throttle.
- No horizontal overflow at 375px; desktop table and Schedule tab visually
  unchanged; add/remove/reorder/star/priority all still work.
