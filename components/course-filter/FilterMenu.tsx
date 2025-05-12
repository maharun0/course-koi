'use client';

import { useEffect, useRef } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { CourseRow } from '@/types/course';

interface FilterMenuProps {
  view: 'all' | 'starred';
  query: string;
  setQuery: (value: string) => void;
  filterColumns: string[];
  setFilterColumns: Dispatch<SetStateAction<string[]>>;
  showFilterMenu: boolean;
  setShowFilterMenu: (value: boolean) => void;
  selectedAllCourses: string[];
  setSelectedAllCourses: Dispatch<SetStateAction<string[]>>; // Updated type
  selectedStarredCourses: string[];
  setSelectedStarredCourses: Dispatch<SetStateAction<string[]>>; // Updated type
  savedCourses: CourseRow[];
  starredCourses: CourseRow[];
}

export default function FilterMenu({
  view,
  query,
  setQuery,
  filterColumns,
  setFilterColumns,
  showFilterMenu,
  setShowFilterMenu,
  selectedAllCourses,
  setSelectedAllCourses,
  selectedStarredCourses,
  setSelectedStarredCourses,
  savedCourses,
  starredCourses,
}: FilterMenuProps) {
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterMenu &&
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        if (filterColumns.length === 0) {
          setFilterColumns(['courseCode', 'facultyCode', 'room']);
        }
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu, filterColumns, setFilterColumns, setShowFilterMenu]);

  const toggleFilterColumn = (column: string) => {
    setFilterColumns((prev: string[]) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const handleFilterMenuClose = () => {
    if (filterColumns.length === 0) {
      setFilterColumns(['courseCode', 'facultyCode', 'room']);
    }
    setShowFilterMenu(false);
  };

  const toggleAllCourseFilter = (courseCode: string) => {
    setSelectedAllCourses((prev: string[]) =>
      prev.includes(courseCode) ? prev.filter((code) => code !== courseCode) : [...prev, courseCode]
    );
  };

  const toggleStarredCourseFilter = (courseCode: string) => {
    setSelectedStarredCourses((prev: string[]) =>
      prev.includes(courseCode) ? prev.filter((code) => code !== courseCode) : [...prev, courseCode]
    );
  };

  return (
    <>
      <div className="flex justify-center mb-6 items-center space-x-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by course code, faculty code, or room number…"
          className="w-full max-w-lg border rounded p-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
        />
        <div className="relative">
          <button
            ref={filterButtonRef}
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer"
          >
            Filter by
          </button>
          {showFilterMenu && (
            <div
              ref={filterMenuRef}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10"
            >
              <div className="p-2">
                {['courseCode', 'facultyCode', 'room', 'section', 'time'].map((col) => (
                  <label key={col} className="flex items-center space-x-2 p-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterColumns.includes(col)}
                      onChange={() => toggleFilterColumn(col)}
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                    <span className="text-sm capitalize">
                      {col === 'courseCode' ? 'Course' : col === 'facultyCode' ? 'Faculty' : col}
                    </span>
                  </label>
                ))}
              </div>
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleFilterMenuClose}
                  className="w-full text-center px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {view === 'all' && savedCourses.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from(new Set(savedCourses.map((c) => c.courseCode)))
              .sort()
              .map((courseCode) => (
                <button
                  key={courseCode}
                  onClick={() => toggleAllCourseFilter(courseCode)}
                  className={`px-2 py-1 text-xs rounded border ${
                    selectedAllCourses.includes(courseCode)
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                  } flex items-center cursor-pointer`}
                >
                  {courseCode}
                  {selectedAllCourses.includes(courseCode) && (
                    <span className="ml-1 inline-flex items-center">✕</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
      {view === 'starred' && starredCourses.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from(new Set(starredCourses.map((c) => c.courseCode)))
              .sort()
              .map((courseCode) => (
                <button
                  key={courseCode}
                  onClick={() => toggleStarredCourseFilter(courseCode)}
                  className={`px-2 py-1 text-xs rounded border ${
                    selectedStarredCourses.includes(courseCode)
                      ? 'bg-gray-600 text-white border-gray-600'
                      : 'bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                  } flex items-center cursor-pointer`}
                >
                  {courseCode}
                  {selectedStarredCourses.includes(courseCode) && (
                    <span className="ml-1 inline-flex items-center">✕</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
      <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
        <p>
          Set priority values to rank sections. Click column headers to sort. Click again to toggle
          ascending/descending/turn off sorting.
        </p>
      </div>
    </>
  );
}