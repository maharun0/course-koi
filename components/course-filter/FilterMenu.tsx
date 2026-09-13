'use client';

import { useEffect, useRef } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { CourseRow } from '@/types/course';
import { FaFilter, FaSearch, FaTimes, FaPlus } from 'react-icons/fa';

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
  onOpenSidebar?: () => void;
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
  onOpenSidebar,
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
            className="block w-full pl-10 pr-10 py-2 rounded-control border border-rule bg-raised text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-rest transition-all duration-150 ease-spring"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-ink-3 group-focus-within:text-accent transition-colors duration-150 ease-spring" />
          </div>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3 hover:text-ink transition-colors duration-150 ease-spring"
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
            className={`flex items-center gap-2 px-3 py-2 rounded-control text-body font-medium transition-all duration-150 ease-spring shadow-rest ${showFilterMenu
              ? 'bg-accent text-accent-ink'
              : 'bg-surface border border-rule text-ink hover:bg-rule-soft'
              }`}
          >
            <FaFilter className={showFilterMenu ? 'text-accent-ink' : 'text-ink-3'} />
            Columns
          </button>

          {showFilterMenu && (
            <div
              ref={filterMenuRef}
              className="absolute right-0 mt-2 w-56 glass rounded-panel shadow-float z-20 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-rule">
                <h3 className="text-mini font-semibold text-ink-3">Visible columns</h3>
              </div>
              <div className="p-2 space-y-1">
                {['courseCode', 'facultyCode', 'room', 'section', 'time'].map((col) => {
                  const label = col === 'courseCode' ? 'Course' : col === 'facultyCode' ? 'Faculty' : col.charAt(0).toUpperCase() + col.slice(1);
                  const isSelected = filterColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => toggleFilterColumn(col)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-control text-body transition-colors duration-150 ease-spring ${isSelected ? 'bg-accent/15 text-accent' : 'text-ink-2 hover:bg-rule-soft hover:text-ink'
                        }`}
                    >
                      <span>{label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-pill bg-accent shadow-glow"></span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Pills */}
      <div className="flex flex-wrap gap-1.5 animate-fade-in">
        <button
          onClick={() => (view === 'all' ? setSelectedAllCourses([]) : setSelectedStarredCourses([]))}
          className={`px-2.5 py-1 rounded-pill text-mini font-medium border transition-all duration-150 ease-spring ${selectedCourses.length === 0
            ? 'bg-accent text-accent-ink border-transparent shadow-rest'
            : 'bg-surface text-ink-2 border-rule hover:bg-rule-soft'
            }`}
        >
          ALL
        </button>
        {uniqueCourses.map((courseCode) => {
          const isActive = selectedCourses.includes(courseCode);
          return (
            <button
              key={courseCode}
              onClick={() => toggleCourseFilter(courseCode)}
              className={`px-2.5 py-1 rounded-pill text-mini font-medium border transition-all duration-150 ease-spring flex items-center gap-1.5 ${isActive
                ? 'bg-accent text-accent-ink border-transparent shadow-rest'
                : 'bg-surface text-ink-2 border-rule hover:bg-rule-soft'
                }`}
            >
              {courseCode}
              {isActive && <FaTimes className="text-[10px] opacity-70" />}
            </button>
          );
        })}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="px-2.5 py-1 rounded-pill text-mini font-medium border border-dashed border-accent/40 text-accent hover:bg-accent/10 hover:border-accent/60 transition-all duration-150 ease-spring flex items-center gap-1.5"
          >
            <FaPlus className="text-[10px]" />
            Add Course
          </button>
        )}
      </div>
    </div>
  );
}
