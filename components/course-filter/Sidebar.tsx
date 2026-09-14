'use client';

import { useState, useMemo, useEffect, useDeferredValue, Dispatch, SetStateAction } from 'react';
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
      className={`relative group rounded-control transition-colors duration-150 ease-spring touch-none ${activeCourse === c.courseCode
        ? 'bg-accent text-accent-ink shadow-rest'
        : 'hover:bg-rule-soft text-ink-2 hover:text-ink'
        }`}
    >
      <button
        onClick={() => handleMyCourseClick(c.courseCode)}
        className="w-full text-left pl-2.5 pr-9 py-2 flex items-center gap-2 cursor-pointer"
        title={c.courseCode}
      >
        <div className={`w-1.5 h-1.5 rounded-pill shrink-0 ${activeCourse === c.courseCode ? 'bg-accent-ink' : 'bg-ok'}`} />
        <span className="font-medium text-body truncate flex-1">{c.courseCode}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveCourse(c.courseCode);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-pill text-ink-3 hover:text-bad opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 ease-spring cursor-pointer"
        title={`Remove ${c.courseCode}`}
      >
        <FaTimes size={11} />
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
  const isSearching = deferredInput.trim().length > 0;

  // Escape closes the drawer — the panel covers the header's hamburger while
  // open, so it needs its own ways out (this, the × below, and the backdrop).
  useEffect(() => {
    if (isCollapsed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCollapsed(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCollapsed, setIsCollapsed]);

  // Search results, only computed while actually searching
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const lowerInput = deferredInput.toLowerCase();
    return courseOptions
      .filter((c) => c.toLowerCase().includes(lowerInput))
      .slice(0, 50)
      .map((code) => ({
        code,
        isSaved: savedCourses.some((s) => s.courseCode === code),
      }));
  }, [isSearching, deferredInput, courseOptions, savedCourses]);

  const handleMyCourseClick = (courseCode: string) => {
    setView('all');
    setActiveCourse(courseCode);
    onTabChange?.('list');
    setIsCollapsed(true);
  };

  const handleSearchResultClick = (courseCode: string, isSaved: boolean) => {
    if (!isSaved) {
      // Adding stays open — people usually add several courses in a row.
      addCourse(courseCode);
    } else {
      // Jumping to an already-added course is navigation, so get out of the way.
      setView('all');
      setActiveCourse(courseCode);
      setSearchTerm('');
      setIsCollapsed(true);
    }
  };

  const handleRemoveCourse = (course: string) => {
    setSavedCourses(savedCourses.filter((c) => c.courseCode !== course));
    if (activeCourse === course) {
      setActiveCourse(null);
      setView('all');
    }
  };

  const navItemClass = (isActive: boolean) =>
    `w-full text-left px-2.5 py-2 rounded-control flex items-center gap-2.5 text-body font-medium transition-colors duration-150 ease-spring cursor-pointer ${isActive
      ? 'bg-accent/15 text-accent'
      : 'text-ink-2 hover:bg-rule-soft hover:text-ink'
    }`;

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
        id="courses-panel"
        aria-hidden={isCollapsed}
        className={`fixed left-2 top-2 md:top-16 bottom-2 z-40 w-[85vw] max-w-64 sm:w-64 flex flex-col transition-[transform,opacity] duration-200 ease-spring will-change-transform ${isCollapsed ? '-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
      >
        {/* Panel */}
        <div className="glass rounded-panel p-3 flex-1 flex flex-col overflow-hidden relative gap-3 w-full">
          {/* Title + close. On desktop the drawer opens below the navbar so the
              header trigger stays visible and toggles it shut; on mobile the
              drawer covers the header, so this × is the only way out. */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-lead font-bold text-ink tracking-tight">Courses</h2>
            <button
              onClick={() => setIsCollapsed(true)}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-pill text-ink-3 hover:text-ink hover:bg-rule-soft transition-colors duration-150 ease-spring cursor-pointer"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Search — one input at the top, where a search field is expected */}
          <div className="relative group shrink-0">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 group-focus-within:text-accent transition-colors duration-150 ease-spring text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or add a course..."
              className="w-full bg-raised border border-rule rounded-control py-2 pl-9 pr-8 text-body text-ink focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all duration-150 ease-spring placeholder-ink-3"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-pill text-ink-3 hover:text-ink cursor-pointer"
                title="Clear search"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          {/* One list, two states: saved courses when idle, results while searching */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-0.5 pb-1.5 shrink-0">
              <h3 className="text-mini font-bold text-ink-3">
                {isSearching ? 'Search results' : 'My courses'}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-0.5 px-0.5 space-y-0.5">
              {isSearching ? (
                <>
                  {searchResults.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => handleSearchResultClick(item.code, item.isSaved)}
                      className={`w-full text-left px-2.5 py-2 rounded-control flex items-center gap-2.5 transition-colors duration-150 ease-spring cursor-pointer ${item.isSaved
                        ? 'text-ink-3 hover:bg-rule-soft'
                        : 'text-ink-2 hover:bg-rule-soft hover:text-ink'
                        }`}
                      title={item.isSaved ? `${item.code} — already added` : `Add ${item.code}`}
                    >
                      {item.isSaved ? (
                        <FaCheck className="text-ok shrink-0" size={11} />
                      ) : (
                        <FaPlus className="text-accent shrink-0" size={11} />
                      )}
                      <span className="font-medium text-body truncate">{item.code}</span>
                    </button>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-6 text-ink-3 text-mini">
                      No matches found.
                    </div>
                  )}
                </>
              ) : (
                <>
                  {savedCourses.length === 0 && (
                    <div className="text-center py-6 px-2 text-ink-3 text-mini leading-relaxed">
                      Search above to add your courses.
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
                </>
              )}
            </div>
          </div>

          {/* Footer: the view switchers + utility, grouped together */}
          <div className="pt-2 border-t border-rule space-y-0.5 shrink-0">
            <button
              onClick={() => {
                setView('all');
                setActiveCourse(null);
                onTabChange?.('list');
                setIsCollapsed(true);
              }}
              className={navItemClass(activeCourse === null && view === 'all')}
              title="All Courses"
            >
              <FaLayerGroup size={12} className={activeCourse === null && view === 'all' ? 'text-accent' : 'text-ink-3'} />
              <span>All courses</span>
            </button>

            <button
              onClick={() => {
                setView('starred');
                setActiveCourse(null);
                setSelectedStarredCourses([]);
                onTabChange?.('list');
                setIsCollapsed(true);
              }}
              className={navItemClass(view === 'starred')}
              title="Starred Sections"
            >
              <FaStar size={12} className={view === 'starred' ? 'text-gold' : 'text-ink-3'} />
              <span>Starred sections</span>
            </button>

            <button
              onClick={() => setCoursePriorities({})}
              className="w-full text-left px-2.5 py-2 rounded-control flex items-center gap-2.5 text-body font-medium text-ink-3 hover:text-bad hover:bg-bad/10 transition-colors duration-150 ease-spring cursor-pointer"
              title="Reset Priorities"
            >
              <FaTrash size={11} />
              <span>Reset priorities</span>
            </button>
          </div>
        </div>
      </aside>

      {showDialog === 'added' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ok text-accent-ink px-4 py-2 rounded-control shadow-float animate-fade-in-up z-50 flex items-center gap-2">
          <FaBook />
          <span>Course Added</span>
        </div>
      )}
      {showDialog === 'error' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-bad text-accent-ink px-4 py-2 rounded-control shadow-float animate-fade-in-up z-50">
          Course not found.
        </div>
      )}
    </>
  );
}
