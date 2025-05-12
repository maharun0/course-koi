"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { FaStar } from "react-icons/fa";

// Updated CourseRow interface to match new CSV format
interface CourseRow {
  id: string; // Generated from Course Code + Section
  courseCode: string;
  credit: number;
  section: string;
  facultyCode: string;
  days: string;
  time: string; // Combination of Days and Time
  room: string;
  seat: number;
}

type SortKey = keyof CourseRow | "index";

export default function CourseFilterPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [query, setQuery] = useState("");
  const [starredQuery, setStarredQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "index",
    dir: "asc",
  });
  const [savedCourses, setSavedCourses] = useState<CourseRow[]>([]);
  const [starredCourses, setStarredCourses] = useState<CourseRow[]>([]);
  const [inputCourse, setInputCourse] = useState("");
  const [showDialog, setShowDialog] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "starred">("all");

  // Fetch and parse new CSV format
  useEffect(() => {
    fetch("/courses_pdf.csv")
      .then((r) => r.text())
      .then((txt) => {
        const parsed: CourseRow[] = txt
          .trim()
          .split(/\r?\n/)
          .slice(1) // Skip header row
          .filter(Boolean)
          .map((ln) => ln.split(",").map((c) => c.trim()))
          .map((c) => ({
            id: `${c[0]}-${c[2]}`, // Generate id from Course Code + Section
            courseCode: c[0],
            credit: Number(c[1]),
            section: c[2],
            facultyCode: c[3],
            days: c[4],
            time: `${c[4]} ${c[5]}`, // Combine Days and Time
            room: c[6],
            seat: Number(c[7]),
          }));
        setRows(parsed);
      });
  }, []);

  // Load saved and starred courses from localStorage
  useEffect(() => {
    const storedSaved = JSON.parse(localStorage.getItem("savedCourses") ?? "[]");
    setSavedCourses(Array.isArray(storedSaved) ? storedSaved : []);
    const storedStarred = JSON.parse(localStorage.getItem("starredCourses") ?? "[]");
    setStarredCourses(Array.isArray(storedStarred) ? storedStarred : []);
  }, []);

  // Save saved courses to localStorage
  useEffect(() => {
    localStorage.setItem("savedCourses", JSON.stringify(savedCourses));
  }, [savedCourses]);

  // Save starred courses to localStorage
  useEffect(() => {
    localStorage.setItem("starredCourses", JSON.stringify(starredCourses));
  }, [starredCourses]);

  // Derived data
  const courseOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.courseCode))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let base = rows;
    if (activeCourse) base = base.filter((r) => r.courseCode === activeCourse);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(
      (r) =>
        r.courseCode.toLowerCase().includes(q) ||
        r.facultyCode.toLowerCase().includes(q) ||
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

  const starredFiltered = useMemo(() => {
    if (!starredQuery) return starredCourses;
    const q = starredQuery.toLowerCase();
    return starredCourses.filter(
      (r) =>
        r.courseCode.toLowerCase().includes(q) ||
        r.facultyCode.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q)
    );
  }, [starredCourses, starredQuery]);

  const starredSorted = useMemo(() => {
    if (sort.key === "index") return starredFiltered;
    const k = sort.key as keyof CourseRow;
    return [...starredFiltered].sort((a, b) => {
      let v1: string | number = a[k];
      let v2: string | number = b[k];
      if (typeof v1 === "string") v1 = v1.toLowerCase();
      if (typeof v2 === "string") v2 = v2.toLowerCase();
      if (v1 < v2) return sort.dir === "asc" ? -1 : 1;
      if (v1 > v2) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [starredFiltered, sort]);

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
      className="px-4 py-2 text-left text-sm font-semibold cursor-pointer select-none hover:underline text-inherit"
    >
      {label}
      {sort.key === key && (sort.dir === "asc" ? " ↑" : " ↓")}
    </th>
  );

  // Sidebar logic
  const addCourse = () => {
    const upperCaseCourse = inputCourse.toUpperCase().trim();
    const courseToAdd = rows.find(
      (r) => r.courseCode.toUpperCase() === upperCaseCourse
    );
    if (
      courseToAdd &&
      !savedCourses.some((saved) => saved.courseCode === courseToAdd.courseCode)
    ) {
      setSavedCourses([...savedCourses, courseToAdd]);
      setInputCourse("");
      setShowDialog("added");
      setTimeout(() => setShowDialog(null), 3000);
    } else {
      setShowDialog("error");
      setTimeout(() => setShowDialog(null), 3000);
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
      setInputCourse("");
    } else {
      setActiveCourse(course);
      setQuery("");
    }
  };

  const handleRemoveCourse = (course: string) => {
    setSavedCourses(savedCourses.filter((c) => c.courseCode !== course));
  };

  const handleDragStart = (course: string) => {
    setDragging(course);
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleDrop = (course: string) => {
    if (!dragging) return;
    const newOrder = savedCourses.filter((c) => c.courseCode !== dragging);
    const index = newOrder.findIndex((c) => c.courseCode === course);
    if (index === -1) return;
    newOrder.splice(
      index,
      0,
      savedCourses.find((c) => c.courseCode === dragging)!
    );
    setSavedCourses(newOrder);
    setDragging(null);
  };

  // Toggle star for a course
  const toggleStar = (course: CourseRow) => {
    if (starredCourses.some((c) => c.id === course.id)) {
      setStarredCourses(starredCourses.filter((c) => c.id !== course.id));
    } else {
      setStarredCourses([...starredCourses, course]);
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors`}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 m-4 p-4 space-y-6 bg-gray-800/80 backdrop-blur rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold">Course Management</h2>

        <div className="space-y-2">
          <button
            onClick={() => {
              setView("all");
              setActiveCourse(null);
              setInputCourse("");
            }}
            className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
              view === "all" && !activeCourse ? "bg-indigo-500 text-white" : ""
            }`}
          >
            All Courses
          </button>
          {savedCourses.length === 0 && (
            <p className="text-sm opacity-70 text-gray-400">
              No saved courses.
            </p>
          )}
          {savedCourses.map((c) => (
            <button
              key={c.courseCode}
              onClick={() => {
                setView("all");
                handleSelectCourse(c.courseCode);
              }}
              onDragStart={() => handleDragStart(c.courseCode)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(c.courseCode)}
              draggable
              className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
                view === "all" && activeCourse === c.courseCode ? "bg-indigo-500 text-white" : ""
              } flex justify-between items-center`}
            >
              {c.courseCode}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCourse(c.courseCode);
                }}
                className="text-sm text-red-500 cursor-pointer"
              >
                ❌
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setView("starred")}
            className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
              view === "starred" ? "bg-indigo-500 text-white" : ""
            } flex items-center`}
          >
            <FaStar className="mr-2 text-yellow-400" />
            Starred Courses
          </button>
        </div>

        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium">Add Course</h3>
          <input
            type="text"
            value={inputCourse}
            onChange={(e) => setInputCourse(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Search & add course"
            className="w-full border rounded p-2 bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
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
              !inputCourse ||
              savedCourses.some((c) => c.courseCode === inputCourse)
            }
          >
            Add
          </button>
        </div>

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

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-center">
          <Image
            src="/course_koi.png"
            alt="Course Koi"
            width={64}
            height={64}
            className="rounded-full mr-4"
          />
          <h1 className="text-5xl font-bold text-yellow-500">Course Koi?</h1>
        </div>

        {(view === "all" || view === "starred") && (
          <div className="flex justify-center mb-6">
            <input
              type="text"
              value={view === "all" ? query : starredQuery}
              onChange={(e) => (view === "all" ? setQuery(e.target.value) : setStarredQuery(e.target.value))}
              placeholder="Search by course code, faculty code, or room number…"
              className="w-full max-w-lg border rounded p-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full shadow rounded bg-white dark:bg-gray-800">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                {header("#", "index")}
                {header("Course", "courseCode")}
                {header("Sec", "section")}
                {header("Faculty", "facultyCode")}
                {header("Time", "time")}
                {header("Room", "room")}
                {header("Seats", "seat")}
                <th className="px-4 py-2"></th> {/* Empty header for star */}
              </tr>
            </thead>
            <tbody>
              {(view === "all" ? sorted : starredSorted).map((r, idx) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2">{r.courseCode}</td>
                  <td className="px-4 py-2">{r.section}</td>
                  <td className="px-4 py-2">{r.facultyCode}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{r.time}</td>
                  <td className="px-4 py-2">{r.room}</td>
                  <td className="px-4 py-2 text-center">{r.seat}</td>
                  <td className="px-4 py-2">
                    <FaStar
                      className={`cursor-pointer ${
                        starredCourses.some((c) => c.id === r.id)
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                      onClick={() => toggleStar(r)}
                    />
                  </td>
                </tr>
              ))}
              {(view === "all" ? sorted : starredSorted).length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-400 dark:text-gray-500">
                    {view === "all" ? "No matching records." : "No starred courses."}
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