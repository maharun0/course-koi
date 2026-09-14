'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CourseTable from '@/components/course-filter/CourseTable';
import FilterMenu from '@/components/course-filter/FilterMenu';
import PriorityModal from '@/components/course-filter/PriorityModal';
import Sidebar from '@/components/course-filter/Sidebar';
import ScheduleView from '@/components/course-filter/ScheduleView';
import useCourseData from '@/hooks/useCourseData';
import useFiltering from '@/hooks/useFiltering';
import useSorting from '@/hooks/useSorting';
import { CourseRow } from '@/types/course';
import { shortUpdatedLabel } from '@/utils/courseDisplay';
import Shuffle from '@/components/Shuffle';
import Image from 'next/image';
import { FaGithub, FaList, FaCalendarAlt, FaBars } from 'react-icons/fa';
import { TbLayoutSidebarLeftExpand, TbLayoutSidebarLeftCollapse } from 'react-icons/tb';

function CourseKoiApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    rows,
    lastUpdated,
    savedCourses,
    setSavedCourses,
    starredCourses,
    setStarredCourses,
    coursePriorities,
    setCoursePriorities,
    courseOptions,
    addCourse,
    inputCourse,
    setInputCourse,
    showDialog,
    setShowDialog,
  } = useCourseData();

  const {
    view,
    setView,
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
    listMode,
    setListMode,
    filteredData,
    starredFilteredData,
  } = useFiltering(rows, starredCourses, coursePriorities, savedCourses);

  const { sorts, toggleSort, sortedData, starredSortedData } = useSorting(filteredData, starredFilteredData);

  const [activeTab, setActiveTabState] = useState<'list' | 'schedule'>('list');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Sync state with URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'schedule') { // Only sync if explicit
      setActiveTabState('schedule');
    } else {
      setActiveTabState('list');
    }
  }, [searchParams]);

  const setActiveTab = (tab: 'list' | 'schedule') => {
    setActiveTabState(tab);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'schedule') {
      params.set('tab', 'schedule');
    } else {
      params.delete('tab');
    }
    router.push(`/?${params.toString()}`);
  };

  // Wrapped so the memoized CourseTable/ScheduleView below don't re-render on
  // unrelated state changes (e.g. opening the sidebar). toggleStar keeps its
  // dependency on starredCourses — that identity change is intentional, since
  // the star icons genuinely need to re-render when it changes.
  const toggleStar = useCallback((course: CourseRow) => {
    if (starredCourses.some((c) => c.id === course.id)) {
      setStarredCourses(starredCourses.filter((c) => c.id !== course.id));
      setSelectedStarredCourses((prev) => prev.filter((code) => code !== course.courseCode));
    } else {
      setStarredCourses([...starredCourses, course]);
    }
  }, [starredCourses, setStarredCourses, setSelectedStarredCourses]);

  const changePriority = useCallback((course: CourseRow, priority: number) => {
    setCoursePriorities((prev) => ({
      ...prev,
      [course.id]: priority,
    }));
  }, [setCoursePriorities]);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-ink font-sans selection:bg-accent/30">

      {/* Absolute Background Effects */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-pill bg-accent-2/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-pill bg-accent/10 blur-[120px]" />
      </div>

      <Sidebar
        savedCourses={savedCourses}
        setSavedCourses={setSavedCourses}
        courseOptions={courseOptions}
        addCourse={addCourse}
        inputCourse={inputCourse}
        setInputCourse={setInputCourse}
        view={view}
        setView={setView}
        activeCourse={activeCourse}
        setActiveCourse={setActiveCourse}
        selectedStarredCourses={selectedStarredCourses}
        setSelectedStarredCourses={setSelectedStarredCourses}
        showDialog={showDialog}
        setShowDialog={setShowDialog}
        coursePriorities={coursePriorities}
        setCoursePriorities={setCoursePriorities}
        onTabChange={setActiveTab}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* ── Desktop / tablet navbar ─────────────────────────────────────────
          Full-bleed bar so the header is anchored like the rest of the app's
          surfaces. Mobile keeps its own two-row header inside <main> below. */}
      <header className="hidden md:flex shrink-0 items-center gap-3 lg:gap-4 h-14 px-3 lg:px-4 bg-surface border-b border-rule relative z-30">
        {/* Drawer trigger sits at the far-left edge, before the brand. Three
            things carry the "this opens a panel" affordance that a bare
            hamburger did not: a sidebar glyph that depicts the panel itself and
            flips to its collapse counterpart while open, a button chassis so it
            reads as a control rather than a page title. */}
        <button
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          className="flex items-center gap-2 h-9 px-2.5 rounded-control border border-rule bg-canvas text-body font-medium text-ink-2 hover:text-ink hover:border-accent hover:bg-rule-soft aria-expanded:text-accent aria-expanded:border-accent transition-colors duration-150 cursor-pointer shrink-0"
          title={sidebarCollapsed ? 'Open courses panel' : 'Close courses panel'}
          aria-label={sidebarCollapsed ? 'Open courses panel' : 'Close courses panel'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="courses-panel"
        >
          {sidebarCollapsed ? (
            <TbLayoutSidebarLeftExpand size={19} className="shrink-0" />
          ) : (
            <TbLayoutSidebarLeftCollapse size={19} className="shrink-0" />
          )}
          <span className="hidden lg:inline">Courses</span>
        </button>

        {/* Brand lock-up — avatar + wordmark sized to read as one mark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/course_koi.png"
            alt="Course Koi"
            width={64}
            height={64}
            className="w-9 h-9 rounded-pill border border-rule shrink-0"
          />
          {/* Solid accent rather than the gradient used on mobile: at this size
              the gradient's light end measures 2.7:1 on the surface (fails AA);
              solid accent is 4.9:1. Two Shuffle instances rather than one so the
              two-tone wordmark survives the per-character split. */}
          <span className="font-display text-figure tracking-tight whitespace-nowrap flex items-baseline gap-[0.3em]">
            <Shuffle
              tag="span"
              text="Course"
              className="text-ink"
              textAlign="left"
              duration={0.32}
              stagger={0.025}
              shuffleTimes={2}
              threshold={0.1}
              rootMargin="0px"
            />
            <Shuffle
              tag="span"
              text="Koi?"
              className="text-accent"
              textAlign="left"
              duration={0.32}
              stagger={0.025}
              shuffleTimes={2}
              threshold={0.1}
              rootMargin="0px"
            />
          </span>
        </div>

        <div className="hidden lg:block w-px h-7 bg-rule shrink-0 ml-1" />

        {/* Freshness stamp — sits with the brand rather than the controls: it
            describes the data the page is showing, it is not something you
            operate. Left-aligned on its own so both lines start on one edge. */}
        <span
          className="hidden lg:flex flex-col items-start whitespace-nowrap shrink-0"
          title={lastUpdated ? `Last updated: ${lastUpdated}` : 'Waiting for the latest sync'}
        >
          <span className="flex items-center gap-1.5 text-micro text-ink-3">
            <span className="w-1.5 h-1.5 rounded-pill bg-ok shrink-0" />
            Updated
          </span>
          <span className="text-mini font-medium text-ink-2 tabular-nums">
            {shortUpdatedLabel(lastUpdated)}
          </span>
        </span>

        {/* Right cluster — view switcher, then the external link */}
        <div className="ml-auto flex items-center gap-2 lg:gap-3 shrink-0">

          {/* View switcher — same height, radius and border language as the
              GitHub button beside it, so the right cluster reads as one set. */}
          <div className="h-9 p-1 border border-rule rounded-control flex items-center relative w-[200px] shrink-0">
            <div
              className="absolute top-1 bottom-1 rounded-chip bg-accent shadow-rest transition-all duration-300 ease-spring z-0"
              style={{
                left: activeTab === 'list' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
            />
            <button
              onClick={() => setActiveTab('list')}
              aria-current={activeTab === 'list' ? 'page' : undefined}
              className={`flex-1 px-3 py-1 rounded-chip text-body font-medium transition-colors duration-150 ease-spring relative z-10 flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'list' ? 'text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
            >
              <FaList size={13} /> List
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              aria-current={activeTab === 'schedule' ? 'page' : undefined}
              className={`flex-1 px-3 py-1 rounded-chip text-body font-medium transition-colors duration-150 ease-spring relative z-10 flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'schedule' ? 'text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
            >
              <FaCalendarAlt size={13} /> Schedule
            </button>
          </div>

          <a
            href="https://github.com/maharun0/course-koi"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 flex items-center gap-2 px-3 rounded-control border border-rule text-body font-medium text-ink-2 hover:text-ink hover:bg-rule-soft transition-colors duration-150 ease-spring shrink-0"
            title="Star on GitHub"
          >
            <FaGithub className="text-lg shrink-0" />
            <span>Star</span>
          </a>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-2 md:px-4 md:pt-4 lg:px-6 flex flex-col overflow-hidden relative">

        {/* Mobile header (md:hidden) — the desktop/tablet navbar above replaces this */}
        <div className="md:hidden flex flex-col justify-between mb-4 sm:mb-6 gap-3 sm:gap-4 shrink-0 z-20 relative">
          <div className="flex items-center justify-between w-full md:w-auto gap-2.5 sm:gap-4 animate-fade-in-down">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              {/* Open-only: the drawer covers this button while open, so closing
                  is handled by the drawer's own ×, Escape, or the backdrop. */}
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-control bg-accent-gradient flex items-center justify-center shadow-rest shrink-0 text-accent-ink hover:shadow-hover transition-shadow duration-150 ease-spring cursor-pointer"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <FaBars size={16} />
              </button>
              <div className="relative group cursor-pointer shrink-0">
                <Image src="/course_koi.png" alt="Course Koi" width={64} height={64} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-pill relative z-10 border-2 border-rule" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl md:text-4xl tracking-tight text-ink mb-0.5 md:mb-1 whitespace-nowrap">
                  Course <span className="text-gradient">Koi?</span>
                </h1>
                <p className="text-ink-2 text-[10px] sm:text-mini font-medium truncate">Last Updated: {lastUpdated ?? '...'}</p>
              </div>
            </div>

            {/* GitHub — mobile only here (top row, right corner); desktop version lives in the second row below */}
            <a
              href="https://github.com/maharun0/course-koi"
              target="_blank"
              rel="noopener noreferrer"
              className="md:hidden shrink-0 flex items-center justify-center w-9 h-9 bg-surface hover:bg-rule-soft text-ink rounded-control transition-colors duration-150 ease-spring border border-rule"
              title="Star on GitHub"
            >
              <FaGithub className="text-lg" />
            </a>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggles */}
            <div className="glass p-1 rounded-control flex items-center relative flex-1 sm:flex-none sm:w-[240px]">
              {/* Sliding Background */}
              <div
                className="absolute top-1 bottom-1 rounded-chip bg-accent shadow-rest transition-all duration-300 ease-spring z-0"
                style={{
                  left: activeTab === 'list' ? '4px' : '50%',
                  width: 'calc(50% - 4px)'
                }}
              />

              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 px-3 py-1.5 rounded-chip text-body font-medium transition-colors duration-150 ease-spring relative z-10 flex items-center justify-center gap-2 ${activeTab === 'list' ? 'text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
              >
                <FaList /> List
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-3 py-1.5 rounded-chip text-body font-medium transition-colors duration-150 ease-spring relative z-10 flex items-center justify-center gap-2 ${activeTab === 'schedule' ? 'text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
              >
                <FaCalendarAlt /> Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 w-full isolate">
          {/* List View */}
          <div
            className={`absolute inset-0 w-full h-full flex flex-col transition-opacity duration-150 ease-spring ${activeTab === 'list'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
              }`}
            style={{ contentVisibility: activeTab === 'list' ? 'visible' : 'hidden' }}
          >
            {/* Fixed section: search/filter bar + course chips never scroll away */}
            <div className="shrink-0 content-padding">
              <FilterMenu
                view={view}
                query={view === 'all' ? query : starredQuery}
                setQuery={view === 'all' ? setQuery : setStarredQuery}
                filterColumns={filterColumns}
                setFilterColumns={setFilterColumns}
                showFilterMenu={showFilterMenu}
                setShowFilterMenu={setShowFilterMenu}
                listMode={listMode}
                setListMode={setListMode}
                selectedAllCourses={selectedAllCourses}
                setSelectedAllCourses={setSelectedAllCourses}
                selectedStarredCourses={selectedStarredCourses}
                setSelectedStarredCourses={setSelectedStarredCourses}
                savedCourses={savedCourses}
                starredCourses={starredCourses}
                onOpenSidebar={() => setSidebarCollapsed(false)}
              />
            </div>
            {/* Scrollable section: table header stays pinned, only rows scroll */}
            <div className="flex-1 overflow-auto custom-scrollbar pb-4 content-padding">
              <CourseTable
                sortedData={view === 'all' ? sortedData : starredSortedData}
                sorts={sorts}
                toggleSort={toggleSort}
                toggleStar={toggleStar}
                changePriority={changePriority}
                starredCourses={starredCourses}
              />
            </div>
          </div>

          {/* Schedule View */}
          <div
            className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-150 ease-spring ${activeTab === 'schedule'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
              }`}
            style={{ contentVisibility: activeTab === 'schedule' ? 'visible' : 'hidden' }}
          >
            <div className="w-full h-full">
              <p className="text-ink-2 mb-4 px-2 hidden">Select from your <strong>Starred</strong> courses to build your weekly schedule.</p>
              <ScheduleView courses={starredCourses} allCourses={sortedData} savedCourses={savedCourses} starredCourses={starredCourses} toggleStar={toggleStar} />
            </div>
          </div>
        </div>

      </main>
      <PriorityModal
        showClearPriorityConfirm={coursePriorities && Object.keys(coursePriorities).length > 0}
        setShowClearPriorityConfirm={() => setCoursePriorities({})}
        clearAllPriorities={() => {
          setCoursePriorities({});
          setShowDialog('cleared');
          setTimeout(() => setShowDialog(null), 3000);
        }}
        setShowDialog={setShowDialog}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas text-ink flex items-center justify-center">Loading...</div>}>
      <CourseKoiApp />
    </Suspense>
  )
}