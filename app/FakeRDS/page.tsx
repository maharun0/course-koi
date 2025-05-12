"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { FaStar, FaPlus, FaTrash, FaEdit } from "react-icons/fa";

// CourseRow interface matching the updated CSV format
interface CourseRow {
  id: string;
  courseCode: string;
  credit: number;
  section: string;
  facultyCode: string;
  days: string;
  time: string;
  room: string;
  seat: number;
}

interface Possibility {
  id: string;
  name: string;
  courses: CourseRow[];
}

type SortKey = keyof CourseRow | "index";

export default function FakeRDSPage() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [possibilities, setPossibilities] = useState<Possibility[]>([
    { id: crypto.randomUUID(), name: "Schedule 1", courses: [] },
  ]);
  const [activePossibilityId, setActivePossibilityId] = useState<string | null>(possibilities[0].id);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "index",
    dir: "asc",
  });
  const [newPossibilityName, setNewPossibilityName] = useState("");
  const [editingPossibilityId, setEditingPossibilityId] = useState<string | null>(null);
  const [editPossibilityName, setEditPossibilityName] = useState("");

  // Fetch and parse CSV
  useEffect(() => {
    fetch("/courses_pdf.csv")
      .then((r) => r.text())
      .then((txt) => {
        const parsed: CourseRow[] = txt
          .trim()
          .split(/\r?\n/)
          .slice(1)
          .filter(Boolean)
          .map((ln) => ln.split(",").map((c) => c.trim()))
          .filter((c) => c.length >= 8)
          .map((c) => {
            const time = c[4] && c[5] ? `${c[4]} ${c[5]}` : "";
            if (!time) {
              console.warn(`Invalid time for course ${c[0]}-${c[2]}: Days=${c[4]}, Time=${c[5]}`);
            }
            return {
              id: `${c[0]}-${c[2]}`,
              courseCode: c[0],
              credit: Number(c[1]) || 0,
              section: c[2],
              facultyCode: c[3],
              days: c[4] || "",
              time,
              room: c[6],
              seat: Number(c[7]) || 0,
            };
          })
          .filter((row) => row.time);
        setRows(parsed);
      })
      .catch((err) => console.error("Failed to fetch or parse CSV:", err));
  }, []);

  // Load possibilities from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("possibilities") ?? "[]");
    if (Array.isArray(stored) && stored.length > 0) {
      setPossibilities(stored);
      setActivePossibilityId(stored[0].id);
    }
  }, []);

  // Save possibilities to localStorage
  useEffect(() => {
    localStorage.setItem("possibilities", JSON.stringify(possibilities));
  }, [possibilities]);

  // Add a new possibility
  const addPossibility = () => {
    if (!newPossibilityName.trim()) return;
    const newId = crypto.randomUUID();
    setPossibilities([
      ...possibilities,
      { id: newId, name: newPossibilityName.trim(), courses: [] },
    ]);
    setActivePossibilityId(newId);
    setNewPossibilityName("");
  };

  // Delete a possibility
  const deletePossibility = (id: string) => {
    const updated = possibilities.filter((p) => p.id !== id);
    setPossibilities(updated);
    if (activePossibilityId === id) {
      setActivePossibilityId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Start editing a possibility name
  const startEditing = (id: string, name: string) => {
    setEditingPossibilityId(id);
    setEditPossibilityName(name);
  };

  // Save edited possibility name
  const saveEdit = (id: string) => {
    setPossibilities(
      possibilities.map((p) =>
        p.id === id ? { ...p, name: editPossibilityName.trim() } : p
      )
    );
    setEditingPossibilityId(null);
    setEditPossibilityName("");
  };

  // Check for time conflicts
  const hasConflict = (course: CourseRow, courses: CourseRow[]): boolean => {
    const parseTime = (timeStr: string) => {
      const [, timePart] = timeStr.split(" ", 2);
      if (!timePart) {
        console.warn(`Invalid time format: ${timeStr}`);
        return null;
      }
      const [start, end] = timePart.split(" - ").map((t) => {
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) {
          console.warn(`Failed to parse time: ${t}`);
          return null;
        }
        const [, hours, minutes, period] = match;
        let h = parseInt(hours);
        if (period.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period.toUpperCase() === "AM" && h === 12) h = 0;
        return h * 60 + parseInt(minutes);
      });
      if (!start || !end) return null;
      return { start, end };
    };

    const courseDays = course.days.split("").map((d) => d.toUpperCase());
    const courseTime = parseTime(course.time);
    if (!courseTime) return false;

    return courses.some((c) => {
      if (c.id === course.id) return false;
      const otherDays = c.days.split("").map((d) => d.toUpperCase());
      const commonDays = courseDays.some((d) => otherDays.includes(d));
      if (!commonDays) return false;

      const otherTime = parseTime(c.time);
      if (!otherTime) return false;

      return (
        (courseTime.start >= otherTime.start && courseTime.start < otherTime.end) ||
        (courseTime.end > otherTime.start && courseTime.end <= otherTime.end) ||
        (courseTime.start <= otherTime.start && courseTime.end >= otherTime.end)
      );
    });
  };

  // Toggle star for a course in the active possibility
  const toggleStar = (course: CourseRow) => {
    if (!activePossibilityId) return;
    setPossibilities(
      possibilities.map((p) => {
        if (p.id !== activePossibilityId) return p;
        if (p.courses.some((c) => c.id === course.id)) {
          return { ...p, courses: p.courses.filter((c) => c.id !== course.id) };
        } else {
          return { ...p, courses: [...p.courses, course] };
        }
      })
    );
  };

  // Derived data

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.courseCode.toLowerCase().includes(q) ||
        r.facultyCode.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q)
    );
  }, [rows, query]);

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

  // Get courses for the active possibility
  const activeCourses = useMemo(() => {
    const possibility = possibilities.find((p) => p.id === activePossibilityId);
    return possibility ? possibility.courses : [];
  }, [possibilities, activePossibilityId]);

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

  return (
    <div className="flex min-h-screen transition-colors">
      {/* Inner Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 m-4 p-4 space-y-6 bg-gray-800/80 backdrop-blur rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold">Schedule Possibilities</h2>

        <div className="space-y-2">
          {possibilities.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              {editingPossibilityId === p.id ? (
                <input
                  type="text"
                  value={editPossibilityName}
                  onChange={(e) => setEditPossibilityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editPossibilityName.trim()) {
                      saveEdit(p.id);
                    }
                  }}
                  className="w-full border rounded p-1 bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
                />
              ) : (
                <button
                  onClick={() => setActivePossibilityId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
                    activePossibilityId === p.id ? "bg-indigo-500 text-white" : ""
                  }`}
                >
                  {p.name}
                </button>
              )}
              <div className="flex space-x-2">
                <FaEdit
                  className="text-gray-400 cursor-pointer hover:text-indigo-500"
                  onClick={() => startEditing(p.id, p.name)}
                />
                <FaTrash
                  className="text-gray-400 cursor-pointer hover:text-red-500"
                  onClick={() => deletePossibility(p.id)}
                />
              </div>
            </div>
          ))}
          {possibilities.length === 0 && (
            <p className="text-sm opacity-70 text-gray-400">
              No possibilities created.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium">Add New Possibility</h3>
          <input
            type="text"
            value={newPossibilityName}
            onChange={(e) => setNewPossibilityName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPossibilityName.trim()) {
                addPossibility();
              }
            }}
            placeholder="Enter possibility name"
            className="w-full border rounded p-2 bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
          />
          <button
            onClick={addPossibility}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-50"
            disabled={!newPossibilityName.trim()}
          >
            <FaPlus className="inline mr-2" /> Add Possibility
          </button>
        </div>
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
          <h1 className="text-5xl font-bold text-yellow-500">Fake RDS</h1>
        </div>

        <div className="flex justify-center mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course code, faculty code, or room number…"
            className="w-full max-w-lg border rounded p-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
          />
        </div>

        {activePossibilityId && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Courses in {possibilities.find((p) => p.id === activePossibilityId)?.name}
            </h2>
            {activeCourses.length === 0 ? (
              <p className="text-gray-400">No courses added to this possibility.</p>
            ) : (
              <ul className="space-y-2">
                {activeCourses.map((c) => (
                  <li
                    key={c.id}
                    className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span>
                      {c.courseCode} - Sec {c.section} ({c.time})
                      {hasConflict(c, activeCourses) && (
                        <span className="text-red-500 ml-2">⚠️ Conflict</span>
                      )}
                    </span>
                    <span className="text-red-500 cursor-pointer" onClick={() => toggleStar(c)}>
                      ❌ Remove
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
                <th className="px-4 py-2">Star</th>
                <th className="px-4 py-2">Conflict</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
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
                        activeCourses.some((c) => c.id === r.id)
                          ? "text-yellow-400"
                          : "text-gray-400"
                      }`}
                      onClick={() => toggleStar(r)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {activeCourses.some((c) => c.id === r.id) &&
                      hasConflict(r, activeCourses) && (
                        <span className="text-red-500">⚠️</span>
                      )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-400 dark:text-gray-500">
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