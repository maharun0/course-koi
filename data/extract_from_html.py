import csv

from bs4 import BeautifulSoup

# Read the HTML file
html_file_path = "data/response.html"
output_csv_path = "public/courses.csv"

with open(html_file_path, "r", encoding="utf-8") as file:
    soup = BeautifulSoup(file, "html.parser")

# Find the table with id "offeredCourseTbl"
table = soup.find("table", id="offeredCourseTbl")

# Extract table headers and rows
headers = ["Course Code", "Credit", "Section", "Faculty", "Days", "Time", "Room", "Seat"]
rows = []

for row in table.find("tbody").find_all("tr"):
    cols = row.find_all("td")
    if len(cols) >= 7:  # Ensure there are enough columns
        course_code = cols[1].text.strip()
        section = cols[2].text.strip()
        faculty = cols[3].text.strip()
        time = cols[4].text.strip()
        room = cols[5].text.strip()
        seat = cols[6].text.strip()

        # Parse days and credit from time if needed
        if " " in time:
            days, time_range = time.split(" ", 1)
        else:
            days = ""
            time_range = time
        credit = "3.0"  # Assuming a default credit value

        rows.append([course_code, credit, section, faculty, days, time_range, room, seat])

# Write to CSV
with open(output_csv_path, "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)
    writer.writerows(rows)

print(f"CSV file has been created at {output_csv_path}")