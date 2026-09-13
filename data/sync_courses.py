"""Fetch the live NSU offered-courses page and regenerate public/courses.csv.

Run manually with `uv run python data/sync_courses.py`, or via the
`sync-courses` GitHub Actions workflow (hourly, gated by the
COURSE_SYNC_ENABLED repo variable).
"""

import csv
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

SOURCE_URL = "https://rds4.northsouth.ac.bd/offered_courses"
HTML_SNAPSHOT_PATH = Path("data/response.html")
OUTPUT_CSV_PATH = Path("public/courses.csv")
HEADERS = ["Course Code", "Credit", "Section", "Faculty", "Days", "Time", "Room", "Seat"]
MIN_EXPECTED_ROWS = 1000


def fetch_html() -> str:
    response = requests.get(SOURCE_URL, timeout=30)
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
    html = fetch_html()
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
    print(f"Synced {len(rows)} course rows to {OUTPUT_CSV_PATH}")


if __name__ == "__main__":
    main()
