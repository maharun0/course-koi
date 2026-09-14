'use client';

import { useState, useMemo, useDeferredValue, Dispatch, SetStateAction } from 'react';
import { FaStar, FaPlus, FaTimes, FaLayerGroup, FaSearch, FaTrash, FaCheck, FaBook } from 'react-icons/fa';
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
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

interface SortableItemProps {
  c: CourseRow;
  activeCourse: string | null;
  handleMyCourseClick: (code: string) => void;
  handleRemoveCourse: (code: string) => void;
}

function SortableCourseItem({ c, activeCourse, handleMyCourseClick, handleRemoveCourse }: SortableItemProps) {
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
      className={`relative group rounded-control transition-colors duration-150 ease-spring touch-none mb-0.5 ${activeCourse === c.courseCode
        ? 'bg-accent text-accent-ink shadow-rest'
        : 'hover:bg-rule-soft text-ink-2 hover:text-ink'
        }`}
    >
      <button
        onClick={() => handleMyCourseClick(c.courseCode)}
        className="w-full text-left px-2 py-1.5 flex items-center gap-2 cursor-pointer"
        title={c.courseCode}
      >
        <div className={`w-1.5 h-1.5 rounded-pill shrink-0 ${activeCourse === c.courseCode ? 'bg-accent-ink' : 'bg-ok'}`} />
        <span className="font-medium text-mini truncate flex-1">{c.courseCode}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveCourse(c.courseCode);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-bad opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-spring cursor-pointer"
      >
        <FaTimes size={10} />
      </button>
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
  isCollapsed,
  setIsCollapsed,
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
    <>
      {/* Backdrop — click to close. Fixed + opacity-only, so it never touches page layout. */}
      <div
        onClick={() => setIsCollapsed(true)}
        className={`fixed inset-0 z-30 bg-scrim/40 transition-opacity duration-150 ease-spring ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
      />

      {/* Overlay drawer — fixed position, transform/opacity only, so opening/closing
          never resizes or reflows the main content behind it. */}
      <aside
        className={`fixed left-2 top-2 bottom-2 z-40 w-[85vw] max-w-64 sm:w-64 flex flex-col transition-[transform,opacity] duration-200 ease-spring will-change-transform ${isCollapsed ? '-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
      >
        {/* Panel */}
        <div className="glass rounded-panel p-3 flex-1 flex flex-col overflow-hidden relative gap-2 w-full">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-rule">
            <div className="w-8 h-8 rounded-control bg-accent-gradient flex items-center justify-center shadow-rest shrink-0">
              <FaLayerGroup className="text-accent-ink text-sm" />
            </div>
            <h2 className="text-body font-bold text-ink tracking-wide">Courses</h2>
          </div>

          {/* All Courses Button (Primary Action) */}
          <div>
            <button
              onClick={() => {
                setView('all');
                setActiveCourse(null);
                onTabChange?.('list');
              }}
              className={`w-full text-left p-1.5 flex items-center gap-2 cursor-pointer rounded-control transition-colors duration-150 ease-spring group border ${activeCourse === null && view === 'all'
                ? 'bg-accent-gradient border-transparent text-accent-ink shadow-rest'
                : 'bg-rule-soft border-rule hover:bg-rule'
                }`}
              title="All Courses"
            >
              <div className={`w-6 h-6 rounded-chip flex items-center justify-center shrink-0 transition-transform duration-150 ease-spring group-hover:scale-110 ${activeCourse === null && view === 'all' ? 'bg-accent-ink/20' : 'bg-accent/15 text-accent'}`}>
                <FaLayerGroup size={12} />
              </div>
              <span className="font-bold text-mini">All Courses</span>
            </button>
          </div>

          {/* Section 1: My Courses (Top) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-rule-soft rounded-control border border-rule">
            <div className="px-2 py-1.5 border-b border-rule">
              <h3 className="text-mini font-bold text-ink-3">My Courses</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
              {savedCourses.length === 0 && (
                <div className="text-center p-2 text-ink-3 text-micro italic">
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
                      handleMyCourseClick={handleMyCourseClick}
                      handleRemoveCourse={handleRemoveCourse}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Section 2: Search Bar (Middle) */}
          <div className="relative group">
            <FaSearch className="absolute left-2.5 top-2.5 text-ink-3 group-focus-within:text-accent transition-colors duration-150 ease-spring text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Add course..."
              className="w-full bg-raised border border-rule rounded-control py-1.5 pl-8 pr-2 text-mini text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-150 ease-spring placeholder-ink-3"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2 text-ink-3 hover:text-ink cursor-pointer">
                <FaTimes size={10} />
              </button>
            )}
          </div>

          {/* Section 3: Available Courses (Bottom) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-rule-soft rounded-control border border-rule">
            <div className="h-1.5" /> {/* Spacer instead of text */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
              {availableCourses.map((item) => (
                <button
                  key={item.code}
                  onClick={() => handleAvailableCourseClick(item.code, item.isSaved)}
                  className={`w-full text-left px-2 py-1.5 rounded-control flex items-center gap-2 transition-colors duration-150 ease-spring cursor-pointer ${item.isSaved
                    ? 'opacity-50 cursor-default'
                    : 'hover:bg-rule text-ink-2 hover:text-ink'
                    }`}
                  title={item.code}
                >
                  {item.isSaved ? (
                    <FaCheck className="text-ok text-[10px] shrink-0" />
                  ) : (
                    <FaPlus className="text-[10px] text-accent shrink-0" />
                  )}
                  <span className={`font-medium text-mini truncate ${item.isSaved ? 'text-ink-3' : ''}`}>
                    {item.code}
                  </span>
                </button>
              ))}
              {availableCourses.length === 0 && (
                <div className="text-center p-2 text-ink-3 text-micro">
                  No matches found.
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-rule space-y-0.5 shrink-0">
            <button
              onClick={() => {
                setView('starred');
                setActiveCourse(null);
                setSelectedStarredCourses([]);
              }}
              className={`w-full text-left p-1.5 rounded-control flex items-center gap-2 text-mini font-medium transition-colors duration-150 ease-spring cursor-pointer ${view === 'starred'
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-ink-2 hover:text-accent hover:bg-accent/10'
                }`}
              title="Starred Sections"
            >
              <FaStar className={view === 'starred' ? 'text-accent' : 'text-ink-3'} size={12} />
              <span>Starred Sections</span>
            </button>

            <button
              onClick={() => setCoursePriorities({})}
              className="w-full text-left p-1.5 rounded-control flex items-center gap-2 text-mini font-medium text-ink-3 hover:text-bad hover:bg-bad/10 transition-colors duration-150 ease-spring cursor-pointer"
              title="Reset Priorities"
            >
              <FaTrash className="text-[10px]" />
              <span>Reset Priorities</span>
            </button>
          </div>
        </div>
      </aside>

      {showDialog === 'added' && (
        <div className="fixed bottom-8 left-8 bg-ok text-accent-ink px-4 py-2 rounded-control shadow-float animate-fade-in-up z-50 flex items-center gap-2">
          <FaBook />
          <span>Course Added</span>
        </div>
      )}
      {showDialog === 'error' && (
        <div className="fixed bottom-8 left-8 bg-bad text-accent-ink px-4 py-2 rounded-control shadow-float animate-fade-in-up z-50">
          Course not found.
        </div>
      )}
    </>
  );
}
