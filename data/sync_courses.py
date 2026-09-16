"""Regenerate public/courses.csv from the NSU offered-courses page.

Two ways in:

  uv run python data/sync_courses.py
      Fetch the page over HTTP. Used by the hourly `sync-courses` workflow
      (gated by the COURSE_SYNC_ENABLED repo variable). Since NSU put the site
      behind a Cloudflare managed challenge this exits 75 without writing
      anything - see plan/course-sync-blocked.md.

  uv run python data/sync_courses.py --from-file <saved.html>
      Parse a copy of the page you saved from your own browser
      (open the page, Ctrl+S / "Save Page As", or copy the DOM). Same parsing,
      same output, no HTTP request - this is the way to refresh the data while
      the live fetch is blocked.
"""

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://rds4.northsouth.ac.bd/offered_courses"
HTML_SNAPSHOT_PATH = Path("data/response.html")
OUTPUT_CSV_PATH = Path("public/courses.csv")
LAST_UPDATED_PATH = Path("public/last_updated.json")
HEADERS = ["Course Code", "Credit", "Section", "Faculty", "Days", "Time", "Room", "Seat"]
MIN_EXPECTED_ROWS = 1000
DHAKA_TZ = ZoneInfo("Asia/Dhaka")


REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


class SourceUnavailable(RuntimeError):
    """The source page could not be read — distinct from a parsing failure."""


def _is_cloudflare_challenge(response: requests.Response) -> bool:
    """Cloudflare's managed challenge answers with 403/503 plus a JS puzzle.

    It is identifiable from the `cf-mitigated: challenge` header, falling back
    to the interstitial's title for older variants that omit it.
    """
    if response.status_code not in (403, 503):
        return False
    if response.headers.get("cf-mitigated", "").lower() == "challenge":
        return True
    return "Just a moment..." in response.text[:4096]


def fetch_html() -> str:
    response = requests.get(SOURCE_URL, headers=REQUEST_HEADERS, timeout=30)

    if _is_cloudflare_challenge(response):
        raise SourceUnavailable(
            f"{SOURCE_URL} is behind a Cloudflare managed challenge "
            f"(HTTP {response.status_code}, cf-mitigated: challenge).\n"
            "The page now requires a real browser to run a JavaScript challenge "
            "and hold a cf_clearance cookie, so no combination of request headers "
            "will get through - this is not a bug in this script.\n"
            "public/courses.csv is left untouched and the site keeps serving the "
            "last good sync. See plan/course-sync-blocked.md for the options."
        )

    response.raise_for_status()
    return response.text


def parse_rows(html: str) -> list[list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id="offeredCourseTbl")
    if table is None:
        raise RuntimeError("offeredCourseTbl not found in fetched HTML")

    rows = []
    for row in table.find("tbody").find_all("tr"):
        cols = row.find_all("td")
        if len(cols) < 7:
            continue

        course_code = cols[1].text.strip()
        section = cols[2].text.strip()
        faculty = cols[3].text.strip()
        time = cols[4].text.strip()
        room = cols[5].text.strip()
        seat = cols[6].text.strip()

        if " " in time:
            days, time_range = time.split(" ", 1)
        else:
            days = ""
            time_range = time
        credit = "3.0"  # Assuming a default credit value

        rows.append([course_code, credit, section, faculty, days, time_range, room, seat])

    return rows


def write_csv(rows: list[list[str]]) -> None:
    with open(OUTPUT_CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(HEADERS)
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--from-file",
        type=Path,
        metavar="HTML",
        help="Parse a locally saved copy of the page instead of fetching it.",
    )
    args = parser.parse_args()

    if args.from_file:
        if not args.from_file.is_file():
            print(f"No such file: {args.from_file}", file=sys.stderr)
            sys.exit(1)
        html = args.from_file.read_text(encoding="utf-8", errors="replace")
        print(f"Parsing {args.from_file} ({len(html):,} bytes)")
    else:
        try:
            html = fetch_html()
        except SourceUnavailable as exc:
            # Print the explanation rather than a traceback: a stack trace here
            # reads as a code fault, and this failure is entirely upstream.
            print(f"Course sync skipped: {exc}", file=sys.stderr)
            sys.exit(75)  # EX_TEMPFAIL - retry later, nothing to fix here

    rows = parse_rows(html)

    if len(rows) < MIN_EXPECTED_ROWS:
        print(
            f"Refusing to write CSV: only {len(rows)} rows parsed "
            f"(expected at least {MIN_EXPECTED_ROWS}). Source page may be down or changed shape.",
            file=sys.stderr,
        )
        sys.exit(1)

    HTML_SNAPSHOT_PATH.write_text(html, encoding="utf-8")
    write_csv(rows)

    now = datetime.now(DHAKA_TZ)
    LAST_UPDATED_PATH.write_text(
        json.dumps({"lastUpdated": now.strftime("%d %B %Y, %I:%M %p")}),
        encoding="utf-8",
    )

    print(f"Synced {len(rows)} course rows to {OUTPUT_CSV_PATH}")


if __name__ == "__main__":
    main()
