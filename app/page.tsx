"use client";

import { useEffect, useState, useMemo } from "react";

interface CourseRow {
  id: string;
  course: string;
  section: string;
  faculty: string;
  dayTime: string;
  room: string;
  seats: number;
}

type SortKey = keyof CourseRow | "index";

export default function CourseFilterPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "index",
    dir: "asc",
  });
  const [savedCourses, setSavedCourses] = useState<CourseRow[]>([]); // Store full course info
  const [inputCourse, setInputCourse] = useState("");
  const [showDialog, setShowDialog] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<string | null>(null); // Active course for filtering
  const [dragging, setDragging] = useState<string | null>(null);

  // Fetch CSV once
  useEffect(() => {
    fetch("/courses.csv")
      .then((r) => r.text())
      .then((txt) => {
        const parsed: CourseRow[] = txt
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map((ln) => ln.split(",").map((c) => c.trim()))
          .map((c) => ({
            id: c[0].replace(/\.$/, ""),
            course: c[1],
            section: c[2],
            faculty: c[3],
            dayTime: c[4],
            room: c[5],
            seats: Number(c[6]),
          }));
        setRows(parsed);
      });
  }, []);

  // Load saved courses from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("savedCourses") ?? "[]");
    setSavedCourses(Array.isArray(stored) ? stored : []);
  }, []);

  // Save saved courses to localStorage
  useEffect(() => {
    localStorage.setItem("savedCourses", JSON.stringify(savedCourses));
  }, [savedCourses]);

  // Derived data
  const courseOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.course))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let base = rows;
    if (activeCourse) base = base.filter((r) => r.course === activeCourse);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(
      (r) =>
        r.course.toLowerCase().includes(q) ||
        r.faculty.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q)
    );
  }, [rows, query, activeCourse]);

  const sorted = useMemo(() => {
    if (sort.key === "index") return filtered;
    const k = sort.key as keyof CourseRow;
    return [...filtered].sort((a, b) => {
      let v1: string | number = a[k];
      let v2: string | number = b[k];
      if (typeof v1 === "string") v1 = v1.toLowerCase();
      if (typeof v2 === "string") v2 = v2.toLowerCase();
      if (v1 < v2) return sort.dir === "asc" ? -1 : 1;
      if (v1 > v2) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  // UI helpers
  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const header = (label: string, key: SortKey) => (
    <th
      key={label}
      onClick={() => toggleSort(key)}
      className="px-4 py-2 text-left text-sm font-semibold cursor-pointer select-none hover:underline"
    >
      {label}
      {sort.key === key && (sort.dir === "asc" ? " ↑" : " ↓")}
    </th>
  );

  // Sidebar logic
  const addCourse = () => {
    const upperCaseCourse = inputCourse.toUpperCase().trim();
    const courseToAdd = rows.find(
      (r) => r.course.toUpperCase() === upperCaseCourse
    );
    if (
      courseToAdd &&
      !savedCourses.some((saved) => saved.course === courseToAdd.course)
    ) {
      setSavedCourses([...savedCourses, courseToAdd]);
      setInputCourse(""); // Reset the input box
      setShowDialog("added");
      setTimeout(() => setShowDialog(null), 3000); // Hide dialog after 3 seconds
    } else {
      setShowDialog("error");
      setTimeout(() => setShowDialog(null), 3000); // Hide alert after 3 seconds
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputCourse) {
      addCourse();
    }
  };

  const handleSelectCourse = (course: string) => {
    if (course === "All Courses") {
      setActiveCourse(null);
      setInputCourse(""); // Clear the search query when selecting "All Courses"
    } else {
      setActiveCourse(course);
      setQuery(""); // Clear the search query when selecting a specific course
    }
  };

  const handleRemoveCourse = (course: string) => {
    setSavedCourses(savedCourses.filter((c) => c.course !== course));
  };

  const handleDragStart = (course: string) => {
    setDragging(course);
  };

  const handleDrop = (course: string) => {
    const newOrder = savedCourses.filter((c) => c.course !== dragging);
    const index = newOrder.findIndex((c) => c.course === course);
    if (index === -1) return;
    if (dragging) {
      newOrder.splice(
        index,
        0,
        savedCourses.find((c) => c.course === dragging)!
      );
    }
    setSavedCourses(newOrder);
    setDragging(null);
  };

  // Render
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* ---------- Sidebar ---------- */}
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 p-4 space-y-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
        <h2 className="text-xl font-semibold">Saved Courses</h2>

        {/* List */}
        <div className="space-y-2">
          <button
            onClick={() => handleSelectCourse("All Courses")}
            className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
              !activeCourse
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            All Courses
          </button>
          {savedCourses.length === 0 && (
            <p className="text-sm opacity-70">No courses added.</p>
          )}
          {savedCourses.map((c) => (
            <button
              key={c.course}
              onClick={() => handleSelectCourse(c.course)}
              onDragStart={() => handleDragStart(c.course)}
              onDrop={() => handleDrop(c.course)}
              draggable
              className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
                activeCourse === c.course
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              } flex justify-between items-center`}
            >
              {c.course}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCourse(c.course);
                }}
                className="text-sm text-red-500 cursor-pointer"
              >
                ❌
              </span>
            </button>
          ))}
        </div>

        {/* Add Course (Input Box) */}
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium">Add Course</h3>
          <input
            type="text"
            value={inputCourse}
            onChange={(e) => setInputCourse(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Search & add course"
            className="w-full border rounded p-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          />
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {courseOptions
              .filter((course) =>
                course.toLowerCase().includes(inputCourse.toLowerCase())
              )
              .map((course) => (
                <li
                  key={course}
                  onClick={() => setInputCourse(course)}
                  className="cursor-pointer hover:bg-indigo-500/20 px-3 py-2"
                >
                  {course}
                </li>
              ))}
          </ul>
          <button
            onClick={addCourse}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-50"
            disabled={
              !inputCourse || savedCourses.some((c) => c.course === inputCourse)
            }
          >
            Add
          </button>
        </div>

        {/* Dialog / Alert */}
        {showDialog === "added" && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
            Course Added!
          </div>
        )}
        {showDialog === "error" && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg">
            Course not found. Enter the course correctly.
          </div>
        )}
      </aside>

      {/* ---------- Main Content ---------- */}
      <main className="flex-1 p-6 space-y-6">
        <h1 className="flex justify-center text-5xl font-bold">Fake RDS</h1>

        {/* Centered and wider Search Bar */}
        <div className="flex justify-center mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course code, faculty initial, or room number…"
            className="w-full max-w-lg border rounded p-2 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full shadow rounded bg-white dark:bg-gray-800">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                {header("#", "index")}
                {header("Course", "course")}
                {header("Sec", "section")}
                {header("Faculty", "faculty")}
                {header("Day & Time", "dayTime")}
                {header("Room", "room")}
                {header("Seats", "seats")}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{r.course}</td>
                  <td className="px-4 py-2">{r.section}</td>
                  <td className="px-4 py-2">{r.faculty}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.dayTime}</td>
                  <td className="px-4 py-2">{r.room}</td>
                  <td className="px-4 py-2 text-center">{r.seats}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm opacity-70"
                  >
                    No matching records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
