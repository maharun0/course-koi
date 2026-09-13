# Plan: Hourly Course Data Sync via GitHub Actions

## Goal
Automatically keep `public/courses.csv` in sync with the live NSU offered-courses
page (`https://rds4.northsouth.ac.bd/offered_courses`), refreshing roughly every
hour, with the whole sync controllable by an env/repo variable (on/off switch).

## Key finding from investigation
The source URL returns a single server-rendered HTML page that already contains
**all** course rows (~3,433) in `#offeredCourseTbl`. The "67 pages" the user sees
in the browser is just client-side DataTable pagination (`pageLength: 50`) — no
crawling across multiple requests is needed, one `GET` is sufficient.

## Chosen approach
**GitHub Actions scheduled workflow** that fetches the source page, re-runs the
existing extraction logic, and commits the updated `public/courses.csv` straight
to `main`. Vercel's existing git integration auto-deploys on push, so no Vercel
cron, no Blob/KV storage, and no new secrets on the Vercel side are needed.

Rejected alternatives (see prior discussion for full pros/cons): on-demand
fetch+cache (soft, not-really-hourly refresh), Vercel Cron + Blob (paid tier /
Hobby cron frequency limits), Vercel Cron + git commit (same frequency limits).

## Steps

### 1. Add a fetch step to the extraction script
- Modify `data/extract_from_html.py` (or add a new `data/sync_courses.py`) so it
  can either:
  - fetch fresh HTML from `https://rds4.northsouth.ac.bd/offered_courses` via
    `requests.get(...)` and parse it directly, **or**
  - keep saving the fetched HTML to `data/response.html` first (as today) and
    then run the existing parse step — preserves the current debugging
    artifact.
- Reuse the existing BeautifulSoup parsing logic (find `table#offeredCourseTbl`,
  same column mapping) — no need to rewrite parsing, just add the HTTP fetch.
- Add `requests` to `pyproject.toml` dependencies.

### 2. Add the env/repo variable gate
- Add a GitHub Actions repository **variable** (not secret, since it's not
  sensitive) named `COURSE_SYNC_ENABLED` (values `"true"`/`"false"`).
- The workflow checks this at the job level (`if:
  vars.COURSE_SYNC_ENABLED == 'true'`) so the sync can be toggled off without
  editing the workflow file — e.g. during NSU semester breaks when the source
  page stops updating, or if the source site changes shape and starts
  producing bad data.

### 3. Create the workflow file
`.github/workflows/sync-courses.yml`:
- Trigger: `schedule: - cron: '0 * * * *'` (hourly) + `workflow_dispatch` for
  manual runs.
- Job:
  1. Checkout repo.
  2. Set up Python (match `.python-version` / `uv`).
  3. Run the fetch+extract script.
  4. Diff `public/courses.csv` — if unchanged, skip the commit (avoid empty
     commits / redeploys when NSU data hasn't changed).
  5. If changed, commit with a message like
     `data synced from <UTC timestamp>` (matching the existing commit style
     seen in git log, e.g. "data synced from 20 May 2026, 06:35 AM") and push
     to `main`.
- Use `GITHUB_TOKEN` (default, already scoped to the repo) for the commit —
  no extra PAT needed since it's pushing to the same repo.

### 4. Safety/robustness
- Fail the job (non-zero exit) if the fetch fails or the parsed table has
  drastically fewer rows than expected (e.g. < 1000), so a bad fetch never
  silently overwrites good data with an empty/broken CSV.
- Keep the timeout on the HTTP request reasonable (e.g. 30s) since the source
  site is occasionally slow.

### 5. Update README
- Document the sync mechanism and the `COURSE_SYNC_ENABLED` toggle so future
  maintainers know why commits appear hourly.

## Out of scope / non-goals
- No changes to the frontend (`hooks/useCourseData.ts` keeps fetching
  `/courses.csv` exactly as it does today).
- No Vercel-side changes, secrets, or storage.
- No change to `data/extract_by_page.py` (PDF extraction path) — unrelated to
  this sync.

## Open questions for user before implementation
- Confirm workflow should commit directly to `main` (vs. opening a PR each
  time) — direct commit matches the existing pattern of manual "data synced
  from ..." commits, so defaulting to that unless told otherwise.
- Confirm cron cadence: hourly as requested, but note GitHub Actions schedule
  timing isn't exact-on-the-hour under load (can be a few minutes late).
