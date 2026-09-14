import { useState, useMemo, useCallback } from 'react';
import { CourseRow } from '@/types/course';
import { CourseListMode } from '@/components/course-filter/courseListMode';

export default function useFiltering(
  rows: CourseRow[],
  starredCourses: CourseRow[],
  coursePriorities: Record<string, number>,
  savedCourses: CourseRow[]
) {
  // The three-state list mode is the source of truth; `view` stays exported as
  // the two-state value the table and chips already branch on, derived from it.
  // "mine" reads from the full row set like "all", just narrowed to the courses
  // in My Courses — so it maps to view 'all'.
  const [listMode, setListMode] = useState<CourseListMode>('all');
  const view: 'all' | 'starred' = listMode === 'starred' ? 'starred' : 'all';
  const setView = useCallback(
    (next: 'all' | 'starred') => setListMode(next === 'starred' ? 'starred' : 'all'),
    []
  );
  const [query, setQuery] = useState('');
  const [starredQuery, setStarredQuery] = useState('');
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [selectedAllCourses, setSelectedAllCourses] = useState<string[]>([]);
  const [selectedStarredCourses, setSelectedStarredCourses] = useState<string[]>([]);
  const [filterColumns, setFilterColumns] = useState<string[]>(['courseCode', 'facultyCode', 'room']);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredData = useMemo(() => {
    let base = rows.map((row) => ({
      ...row,
      priority: coursePriorities[row.id] ?? undefined,
      starred: starredCourses.some((c) => c.id === row.id),
    }));

    if (activeCourse) base = base.filter((r) => r.courseCode === activeCourse);
    if (listMode === 'mine') {
      const myCodes = new Set(savedCourses.map((c) => c.courseCode));
      base = base.filter((r) => myCodes.has(r.courseCode));
    }
    if (selectedAllCourses.length > 0) {
      base = base.filter((r) => selectedAllCourses.includes(r.courseCode));
    }

    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((r) =>
      filterColumns.some((col) => {
        const value = r[col as keyof CourseRow];
        return typeof value === 'string' && value.toLowerCase().includes(q);
      })
    );
  }, [rows, query, activeCourse, coursePriorities, selectedAllCourses, starredCourses, filterColumns, listMode, savedCourses]);

  const starredFilteredData = useMemo(() => {
    const base = starredCourses.map((row) => ({
      ...row,
      priority: coursePriorities[row.id] ?? undefined,
      starred: true,
    }));

    let filtered = base;
    if (selectedStarredCourses.length > 0) {
      filtered = filtered.filter((r) => selectedStarredCourses.includes(r.courseCode));
    }

    if (!starredQuery) return filtered;
    const q = starredQuery.toLowerCase();
    return filtered.filter((r) =>
      filterColumns.some((col) => {
        const value = r[col as keyof CourseRow];
        return typeof value === 'string' && value.toLowerCase().includes(q);
      })
    );
  }, [starredCourses, starredQuery, coursePriorities, selectedStarredCourses, filterColumns]);

  return {
    view,
    setView,
    listMode,
    setListMode,
    query,
    setQuery,
    starredQuery,
    setStarredQuery,
    activeCourse,
    setActiveCourse,
    selectedAllCourses,
    setSelectedAllCourses,
    selectedStarredCourses,
    setSelectedStarredCourses,
    filterColumns,
    setFilterColumns,
    showFilterMenu,
    setShowFilterMenu,
    filteredData,
    starredFilteredData,
  };
}