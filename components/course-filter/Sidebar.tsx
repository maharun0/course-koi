'use client';

import { useState, useMemo, useDeferredValue } from 'react';
import { FaStar, FaPlus, FaTimes, FaLayerGroup, FaSearch, FaTrash, FaChevronLeft, FaChevronRight, FaCheck, FaBook } from 'react-icons/fa';
import { CourseRow } from '@/types/course';

interface SidebarProps {
  savedCourses: CourseRow[];
  setSavedCourses: (courses: CourseRow[]) => void;
  courseOptions: string[];
  addCourse: (courseCode?: string) => void;
  inputCourse: string;
  setInputCourse: (value: string) => void;
  view: 'all' | 'starred';
  setView: (view: 'all' | 'starred') => void;
  activeCourse: string | null;
  setActiveCourse: (course: string | null) => void;
  selectedStarredCourses: string[];
  setSelectedStarredCourses: (courses: string[]) => void;
  showDialog: string | null;
  setShowDialog: (value: string | null) => void;
  coursePriorities: Record<string, number>;
  setCoursePriorities: (priorities: Record<string, number>) => void;
}

export default function Sidebar({
  savedCourses,
  setSavedCourses,
  courseOptions,
  addCourse,
  // inputCourse, // Unused
  // setInputCourse, // Unused
  view,
  setView,
  activeCourse,
  setActiveCourse,
  setSelectedStarredCourses,
  showDialog,
  setCoursePriorities,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredInput = useDeferredValue(searchTerm);

  // Filter available courses based on deferred local search
  const availableCourses = useMemo(() => {
    const lowerInput = deferredInput.toLowerCase();
    return courseOptions
      .filter((c) => c.toLowerCase().includes(lowerInput))
      .slice(0, 50)
      .map((code) => ({
        code,
        isSaved: savedCourses.some((s) => s.courseCode === code),
      }));
  }, [deferredInput, courseOptions, savedCourses]);

  const handleMyCourseClick = (courseCode: string) => {
    setView('all');
    setActiveCourse(courseCode);
  };

  const handleAvailableCourseClick = (courseCode: string, isSaved: boolean) => {
    if (!isSaved) {
      addCourse(courseCode);
      // Optional: Clear search term?
      // setSearchTerm('');
    } else {
      setView('all');
      setActiveCourse(courseCode);
      setSearchTerm('');
    }
  };

  const handleRemoveCourse = (course: string) => {
    setSavedCourses(savedCourses.filter((c) => c.courseCode !== course));
    if (activeCourse === course) {
      setActiveCourse(null);
      setView('all');
    }
  };

  return (
    <aside
      className={`shrink-0 h-[calc(100vh-2rem)] m-4 flex flex-col transition-all duration-300 ease-in-out relative z-20 ${isCollapsed ? 'w-20' : 'w-72'
        }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg z-50 hover:bg-indigo-500 transition-colors border border-white/20 cursor-pointer"
      >
        {isCollapsed ? <FaChevronRight size={12} /> : <FaChevronLeft size={12} />}
      </button>

      {/* Glass Container */}
      <div className="glass rounded-xl p-4 flex-1 flex flex-col overflow-hidden relative gap-4">
        {/* Header */}
        <div className={`flex items-center gap-3 pb-2 border-b border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <FaLayerGroup className="text-white text-lg" />
          </div>
          {!isCollapsed && <h2 className="text-lg font-bold text-white tracking-wide">Courses</h2>}
        </div>

        {/* Section 1: My Courses (Top) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white/5 rounded-xl border border-white/5">
          {!isCollapsed && (
            <div className="p-2 border-b border-white/5 bg-white/5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Courses</h3>
            </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {savedCourses.length === 0 && !isCollapsed && (
              <div className="text-center p-4 text-gray-500 text-xs italic">
                Your list is empty.
              </div>
            )}
            {savedCourses.map((c) => (
              <div
                key={c.courseCode}
                className={`relative group rounded-lg transition-all duration-200 ${activeCourse === c.courseCode
                  ? 'bg-indigo-600/90 text-white shadow-lg'
                  : 'hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
              >
                <button
                  onClick={() => handleMyCourseClick(c.courseCode)}
                  className={`w-full text-left p-2.5 flex items-center gap-3 cursor-pointer ${isCollapsed ? 'justify-center' : ''
                    }`}
                  title={c.courseCode}
                >
                  <div className={`w-2 h-2 rounded-full shadow-lg shrink-0 ${activeCourse === c.courseCode ? 'bg-white' : 'bg-green-400'}`} />
                  {!isCollapsed && <span className="font-medium text-sm truncate flex-1">{c.courseCode}</span>}
                </button>
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCourse(c.courseCode);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <FaTimes size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Search Bar (Middle) */}
        <div className={`${isCollapsed ? 'px-1' : ''}`}>
          {!isCollapsed ? (
            <div className="relative group">
              <FaSearch className="absolute left-3 top-3 text-gray-400 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Add course..."
                className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-gray-500 hover:text-white cursor-pointer">
                  <FaTimes />
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setIsCollapsed(false)} className="w-full aspect-square rounded-xl bg-black/20 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer">
              <FaSearch />
            </button>
          )}
        </div>

        {/* Section 3: Available Courses (Bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white/5 rounded-xl border border-white/5">
          {!isCollapsed && (
            <div className="h-2" /> // Spacer instead of text
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {availableCourses.map((item) => (
              <button
                key={item.code}
                onClick={() => handleAvailableCourseClick(item.code, item.isSaved)}
                className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 cursor-pointer ${item.isSaved
                  ? 'opacity-50 cursor-default'
                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title={item.code}
              >
                {item.isSaved ? (
                  <FaCheck className="text-green-500 text-xs shrink-0" />
                ) : (
                  <FaPlus className="text-xs text-indigo-400 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className={`font-medium text-sm truncate ${item.isSaved ? 'text-gray-500' : ''}`}>
                    {item.code}
                  </span>
                )}
              </button>
            ))}
            {availableCourses.length === 0 && !isCollapsed && (
              <div className="text-center p-4 text-gray-500 text-xs">
                No matches found.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`pt-2 border-t border-white/10 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''} shrink-0`}>
          <button
            onClick={() => {
              setView('starred');
              setActiveCourse(null);
              setSelectedStarredCourses([]);
            }}
            className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer ${view === 'starred'
              ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/20'
              : 'text-gray-400 hover:text-yellow-200 hover:bg-yellow-500/10'
              } ${isCollapsed ? 'justify-center' : ''}`}
            title="Starred Sections"
          >
            <FaStar className={view === 'starred' ? 'text-yellow-400' : 'text-gray-600'} />
            {!isCollapsed && <span>Starred Sections</span>}
          </button>

          <button
            onClick={() => setCoursePriorities({})}
            className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 text-sm font-medium text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''
              }`}
            title="Reset Priorities"
          >
            <FaTrash className="text-xs" />
            {!isCollapsed && <span>Reset Priorities</span>}
          </button>
        </div>
      </div>

      {showDialog === 'added' && (
        <div className="fixed bottom-8 left-8 bg-green-500/90 backdrop-blur text-white px-4 py-2 rounded-lg shadow-xl border border-green-400 animate-fade-in-up z-50 flex items-center gap-2">
          <FaBook />
          <span>Course Added</span>
        </div>
      )}
      {showDialog === 'error' && (
        <div className="fixed bottom-8 left-8 bg-red-500/90 backdrop-blur text-white px-4 py-2 rounded-lg shadow-xl border border-red-400 animate-fade-in-up z-50">
          Course not found.
        </div>
      )}
    </aside>
  );
}
