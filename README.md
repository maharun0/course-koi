NOTE: Website is deployed at [course-koi.maharun.dev](https://course-koi.maharun.dev)
Updated for NSU Spring 2026 Courses

# Course Koi

It's just a quick project which was made when NSU removed searchable website and replaced it with a fu*king PDF file.

## Features
- Search for courses by name or code or faculty
- You can stat sections which makes easier to take decisions

I haven't really made it responsive or spent much time with it. It just does basic stuffs.

## Data sync

`public/courses.csv` is kept in sync with NSU's live offered-courses page
(https://rds4.northsouth.ac.bd/offered_courses) by an hourly GitHub Actions
workflow ([.github/workflows/sync-courses.yml](.github/workflows/sync-courses.yml)),
which fetches the page, re-parses `data/response.html`/`public/courses.csv`
via [data/sync_courses.py](data/sync_courses.py), and commits the result only
when the data actually changed. Vercel then auto-deploys on push.

The sync is gated by the `COURSE_SYNC_ENABLED` repository variable (Settings →
Secrets and variables → Actions → Variables). Set it to `true` to enable the
hourly sync, or `false`/unset to pause it (e.g. during semester breaks when
the source page stops updating).
