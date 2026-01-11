'use client';

import { useEffect, useRef } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { CourseRow } from '@/types/course';
import { FaFilter, FaSearch, FaTimes } from 'react-icons/fa';

interface FilterMenuProps {
  view: 'all' | 'starred';
  query: string;
  setQuery: (value: string) => void;
  filterColumns: string[];
  setFilterColumns: Dispatch<SetStateAction<string[]>>;
  showFilterMenu: boolean;
  setShowFilterMenu: (value: boolean) => void;
  selectedAllCourses: string[];
  setSelectedAllCourses: Dispatch<SetStateAction<string[]>>;
  selectedStarredCourses: string[];
  setSelectedStarredCourses: Dispatch<SetStateAction<string[]>>;
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

  const uniqueCourses = Array.from(
    new Set((view === 'all' ? savedCourses : starredCourses).map((c) => c.courseCode))
  ).sort();

  const selectedCourses = view === 'all' ? selectedAllCourses : selectedStarredCourses;
  const toggleCourseFilter = view === 'all' ? toggleAllCourseFilter : toggleStarredCourseFilter;

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search within table..."
            className="block w-full pl-10 pr-10 py-2 rounded-xl border-none ring-1 ring-black/5 dark:ring-white/10 bg-white/50 dark:bg-black/20 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm shadow-sm transition-all"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
          </div>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="relative">
          <button
            ref={filterButtonRef}
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${showFilterMenu
              ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#f8fafc] dark:ring-offset-[#0f172a]'
              : 'bg-white dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
          >
            <FaFilter className={showFilterMenu ? 'text-white' : 'text-gray-400'} />
            Columns
          </button>

          {showFilterMenu && (
            <div
              ref={filterMenuRef}
              className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-2xl z-20 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visible Columns</h3>
              </div>
              <div className="p-2 space-y-1">
                {['courseCode', 'facultyCode', 'room', 'section', 'time'].map((col) => {
                  const label = col === 'courseCode' ? 'Course' : col === 'facultyCode' ? 'Faculty' : col.charAt(0).toUpperCase() + col.slice(1);
                  const isSelected = filterColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleFilterColumn(col)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                    >
                      <span>{label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50"></span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Pills */}
      {uniqueCourses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {uniqueCourses.map((courseCode) => {
            const isActive = selectedCourses.includes(courseCode);
            return (
              <button
                key={courseCode}
                onClick={() => toggleCourseFilter(courseCode)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 ${isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                  : 'bg-white/40 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-black/5 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
              >
                {courseCode}
                {isActive && <FaTimes className="text-[10px] opacity-70" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
