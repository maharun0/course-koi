'use client';

import { useState, useEffect, Suspense } from 'react';
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
import Image from 'next/image';
import { FaGithub, FaStar, FaList, FaCalendarAlt, FaBars } from 'react-icons/fa';

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
    filteredData,
    starredFilteredData,
  } = useFiltering(rows, starredCourses, coursePriorities);

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

  const toggleStar = (course: CourseRow) => {
    if (starredCourses.some((c) => c.id === course.id)) {
      setStarredCourses(starredCourses.filter((c) => c.id !== course.id));
      setSelectedStarredCourses((prev) => prev.filter((code) => code !== course.courseCode));
    } else {
      setStarredCourses([...starredCourses, course]);
    }
  };

  const changePriority = (course: CourseRow, priority: number) => {
    setCoursePriorities((prev) => ({
      ...prev,
      [course.id]: priority,
    }));
  };

  return (
    <div className="flex min-h-screen text-ink font-sans selection:bg-accent/30">

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

      <main className="flex-1 p-2 h-screen flex flex-col overflow-hidden relative">

        {/* Header Region */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 shrink-0 z-20 relative">
          <div className="flex items-center gap-4 animate-fade-in-down">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 rounded-control bg-accent-gradient flex items-center justify-center shadow-rest shrink-0 text-accent-ink hover:shadow-hover transition-shadow duration-150 ease-spring cursor-pointer"
              title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              <FaBars size={16} />
            </button>
            <div className="relative group cursor-pointer">
              <Image src="/course_koi.png" alt="Course Koi" width={64} height={64} className="rounded-pill relative z-10 border-2 border-rule" />
            </div>
            <div>
              <h1 className="font-display text-4xl tracking-tight text-ink mb-1">
                Course <span className="text-gradient">Koi?</span>
              </h1>
              <p className="text-ink-2 text-mini font-medium">Last Updated: {lastUpdated ?? '...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggles */}
            <div className="glass p-1 rounded-control flex items-center relative w-[240px]">
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

            <a
              href="https://github.com/maharun0/course-koi"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center px-3 py-1.5 bg-surface hover:bg-rule-soft text-ink rounded-control transition-colors duration-150 ease-spring border border-rule"
            >
              <FaGithub className="mr-2 text-xl" />
              <span className="text-body font-medium">Star on GitHub</span>
              <FaStar className="ml-2 text-accent" />
            </a>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 w-full isolate">
          {/* List View */}
          <div
            className={`absolute inset-0 w-full h-full overflow-y-auto custom-scrollbar transition-opacity duration-150 ease-spring ${activeTab === 'list'
              ? 'opacity-100 z-10'
              : 'opacity-0 z-0 pointer-events-none'
              }`}
            style={{ contentVisibility: activeTab === 'list' ? 'visible' : 'hidden' }}
          >
            <div className="pb-4"> {/* Padding bottom for scroll content */}
              <FilterMenu
                view={view}
                query={view === 'all' ? query : starredQuery}
                setQuery={view === 'all' ? setQuery : setStarredQuery}
                filterColumns={filterColumns}
                setFilterColumns={setFilterColumns}
                showFilterMenu={showFilterMenu}
                setShowFilterMenu={setShowFilterMenu}
                selectedAllCourses={selectedAllCourses}
                setSelectedAllCourses={setSelectedAllCourses}
                selectedStarredCourses={selectedStarredCourses}
                setSelectedStarredCourses={setSelectedStarredCourses}
                savedCourses={savedCourses}
                starredCourses={starredCourses}
                onOpenSidebar={() => setSidebarCollapsed(false)}
              />
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
              <ScheduleView courses={starredCourses} allCourses={sortedData} savedCourses={savedCourses} />
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