'use client';

import { useState, useMemo, useDeferredValue, Dispatch, SetStateAction } from 'react';
import { FaStar, FaPlus, FaTimes, FaLayerGroup, FaSearch, FaTrash, FaChevronLeft, FaChevronRight, FaCheck, FaBook } from 'react-icons/fa';
import { CourseRow } from '@/types/course';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  savedCourses: CourseRow[];
  setSavedCourses: Dispatch<SetStateAction<CourseRow[]>>;
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
  onTabChange?: (tab: 'list' | 'schedule') => void;
}

interface SortableItemProps {
  c: CourseRow;
  activeCourse: string | null;
  isCollapsed: boolean;
  handleMyCourseClick: (code: string) => void;
  handleRemoveCourse: (code: string) => void;
}

function SortableCourseItem({ c, activeCourse, isCollapsed, handleMyCourseClick, handleRemoveCourse }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.courseCode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group rounded transition-all duration-200 touch-none mb-0.5 ${activeCourse === c.courseCode
        ? 'bg-indigo-600/90 text-white shadow'
        : 'hover:bg-white/10 text-gray-300 hover:text-white'
        }`}
    >
      <button
        onClick={() => handleMyCourseClick(c.courseCode)}
        className={`w-full text-left px-2 py-1.5 flex items-center gap-2 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
        title={c.courseCode}
      >
        <div className={`w-1.5 h-1.5 rounded-full shadow shrink-0 ${activeCourse === c.courseCode ? 'bg-white' : 'bg-green-400'}`} />
        {!isCollapsed && <span className="font-medium text-xs truncate flex-1">{c.courseCode}</span>}
      </button>
      {!isCollapsed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveCourse(c.courseCode);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <FaTimes size={10} />
        </button>
      )}
    </div>
  );
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
  onTabChange,
}: SidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSavedCourses((items: CourseRow[]) => {
        const oldIndex = items.findIndex((i) => i.courseCode === active.id);
        const newIndex = items.findIndex((i) => i.courseCode === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

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
    onTabChange?.('list');
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
      className={`shrink-0 h-[calc(100vh-1rem)] m-2 flex flex-col transition-all duration-300 ease-in-out relative z-20 ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-indigo-600 text-white p-1 rounded-full shadow-lg z-50 hover:bg-indigo-500 transition-colors border border-white/20 cursor-pointer"
      >
        {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronLeft size={10} />}
      </button>

      {/* Glass Container */}
      <div className="glass rounded-xl p-3 flex-1 flex flex-col overflow-hidden relative gap-2">
        {/* Header */}
        <div className={`flex items-center gap-2 pb-2 border-b border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <FaLayerGroup className="text-white text-sm" />
          </div>
          {!isCollapsed && <h2 className="text-base font-bold text-white tracking-wide">Courses</h2>}
        </div>

        {/* All Courses Button (Primary Action) */}
        <div>
          <button
            onClick={() => {
              setView('all');
              setActiveCourse(null);
              onTabChange?.('list');
            }}
            className={`w-full text-left p-1.5 flex items-center gap-2 cursor-pointer rounded-lg transition-all duration-200 group border ${activeCourse === null && view === 'all'
              ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              } ${isCollapsed ? 'justify-center' : ''}`}
            title="All Courses"
          >
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${activeCourse === null && view === 'all' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-300'}`}>
              <FaLayerGroup size={12} />
            </div>
            {!isCollapsed && <span className="font-bold text-xs text-gray-100">All Courses</span>}
          </button>
        </div>

        {/* Section 1: My Courses (Top) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white/5 rounded-lg border border-white/5">
          {!isCollapsed && (
            <div className="px-2 py-1.5 border-b border-white/5 bg-white/5">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">My Courses</h3>
            </div>
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {savedCourses.length === 0 && !isCollapsed && (
              <div className="text-center p-2 text-gray-500 text-[10px] italic">
                Add courses to see them here.
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={savedCourses.map(c => c.courseCode)} strategy={verticalListSortingStrategy}>
                {savedCourses.map((c) => (
                  <SortableCourseItem
                    key={c.courseCode}
                    c={c}
                    activeCourse={activeCourse}
                    isCollapsed={isCollapsed}
                    handleMyCourseClick={handleMyCourseClick}
                    handleRemoveCourse={handleRemoveCourse}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Section 2: Search Bar (Middle) */}
        <div className={`${isCollapsed ? 'px-1' : ''}`}>
          {!isCollapsed ? (
            <div className="relative group">
              <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 group-focus-within:text-indigo-400 transition-colors text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Add course..."
                className="w-full bg-black/20 border border-white/10 rounded-lg py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2 text-gray-500 hover:text-white cursor-pointer">
                  <FaTimes size={10} />
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setIsCollapsed(false)} className="w-full aspect-square rounded-lg bg-black/20 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer">
              <FaSearch size={12} />
            </button>
          )}
        </div>

        {/* Section 3: Available Courses (Bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white/5 rounded-lg border border-white/5">
          {!isCollapsed && (
            <div className="h-1.5" /> // Spacer instead of text
          )}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {availableCourses.map((item) => (
              <button
                key={item.code}
                onClick={() => handleAvailableCourseClick(item.code, item.isSaved)}
                className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-all duration-200 cursor-pointer ${item.isSaved
                  ? 'opacity-50 cursor-default'
                  : 'hover:bg-white/10 text-gray-400 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title={item.code}
              >
                {item.isSaved ? (
                  <FaCheck className="text-green-500 text-[10px] shrink-0" />
                ) : (
                  <FaPlus className="text-[10px] text-indigo-400 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className={`font-medium text-xs truncate ${item.isSaved ? 'text-gray-500' : ''}`}>
                    {item.code}
                  </span>
                )}
              </button>
            ))}
            {availableCourses.length === 0 && !isCollapsed && (
              <div className="text-center p-2 text-gray-500 text-[10px]">
                No matches found.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`pt-2 border-t border-white/10 space-y-0.5 ${isCollapsed ? 'flex flex-col items-center' : ''} shrink-0`}>
          <button
            onClick={() => {
              setView('starred');
              setActiveCourse(null);
              setSelectedStarredCourses([]);
            }}
            className={`w-full text-left p-1.5 rounded flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer ${view === 'starred'
              ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/20'
              : 'text-gray-400 hover:text-yellow-200 hover:bg-yellow-500/10'
              } ${isCollapsed ? 'justify-center' : ''}`}
            title="Starred Sections"
          >
            <FaStar className={view === 'starred' ? 'text-yellow-400' : 'text-gray-600'} size={12} />
            {!isCollapsed && <span>Starred Sections</span>}
          </button>

          <button
            onClick={() => setCoursePriorities({})}
            className={`w-full text-left p-1.5 rounded flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''
              }`}
            title="Reset Priorities"
          >
            <FaTrash className="text-[10px]" />
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
