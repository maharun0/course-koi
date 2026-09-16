# Course sync is blocked by a Cloudflare challenge

**Status:** blocked upstream since ~15 September 2026. Last good sync: 14 September 2026, 11:46 AM.

## What happened

NSU put `rds4.northsouth.ac.bd` behind a **Cloudflare managed challenge** sometime
between 14 Sep 05:46 UTC (last green run) and 15 Sep 05:48 UTC (first red run).

Evidence from the live response:

```
HTTP/1.1 403 Forbidden
Cf-Mitigated: challenge
Server: cloudflare
<title>Just a moment...</title>
noscript: "Enable JavaScript and cookies to continue"
```

Three facts that pin this down:

1. **Nothing changed on our side.** `data/sync_courses.py` still carries the
   browser `User-Agent` headers added back in 19673f8, which is what fixed the
   *previous* 403. Git shows no change to the script between the last green run
   and the first red one.
2. **It is not GitHub's IP being blocked.** The same request returns 403 from a
   local residential connection too, with and without the UA headers.
3. **It is the whole domain, not our path.** `/`, `/offered_courses` and even
   `/robots.txt` all return the same challenge. There is no unprotected JSON
   API to fall back to either — the table is server-rendered into the HTML.

A managed challenge requires a real browser to execute a JavaScript puzzle and
carry the resulting `cf_clearance` cookie. **No combination of request headers
can pass it** — resisting exactly that is the feature's purpose.

## What was fixed in this pass

- `actions/checkout@v4 → @v7`, `astral-sh/setup-uv@v3 → @v10`, clearing the
  Node 20 deprecation warning.
- The script now recognises the challenge and exits **75 (EX_TEMPFAIL)** with a
  plain-English explanation, instead of a `requests` stack trace that reads like
  our bug.
- The workflow reports exit 75 as a **warning** and skips the commit steps.
  Any other non-zero exit — a genuine parse or code failure — still fails the
  run loudly. Previously every hour produced an identical red run, which would
  have buried a real regression.
- **`--from-file` mode** so the data can still be refreshed by hand (below).

None of this restores the automatic fetch. That needs one of the following.

## Options

### 1. Refresh by hand, today (works now)

Open the page in your browser like any student would, save it, and parse it
locally:

```bash
# 1. Visit https://rds4.northsouth.ac.bd/offered_courses in your browser
# 2. Ctrl+S -> save as HTML (e.g. ~/Downloads/offered_courses.html)
uv run python data/sync_courses.py --from-file ~/Downloads/offered_courses.html
git add public/courses.csv public/last_updated.json data/response.html
git commit -m "data synced manually"
```

Verified against the existing snapshot: parses 3,348 rows to a byte-identical
CSV. Takes about a minute, and the data only really moves during registration.

### 2. Ask NSU for proper access (best long-term fix)

Email the registrar / IT asking for either a data feed for the offered-courses
listing, or an allowlist for the sync. Course Koi is a student tool built on
data NSU already publishes to students, and it has a real user base — that is a
reasonable ask, and it makes the pipeline legitimate and stable instead of
something that breaks whenever a WAF setting changes. This is the only option
that restores unattended hourly syncing.

### 3. Accept staleness and say so

Keep the last good data and surface its age honestly in the UI. The navbar
already shows "Updated {date}", so a visitor can see what they are looking at.
Worth pairing with option 1 or 2 rather than doing alone.

### 4. Drive a real browser in CI — not recommended, not implemented

Technically a headless browser could attempt the challenge. Deliberately
defeating a bot-protection measure the site operator turned on two days ago is a
different thing from reading a public page, and it is likely to be read as
exactly that. Practically it is also the weakest option: Cloudflare challenges
datacenter IPs harder than residential ones, so CI is the worst place to try it,
and it breaks again on their next settings change. Prefer option 2.

## Re-enabling later

The hourly workflow is still gated on the `COURSE_SYNC_ENABLED` repo variable.
Set it to `false` to stop the warning runs entirely while this is blocked, and
back to `true` once access is restored. The script needs no change — if the
challenge is lifted, the normal fetch path resumes working on its own.
