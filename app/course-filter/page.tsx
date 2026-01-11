'use client';

import { useState } from 'react';
import CourseTable from '@/components/course-filter/CourseTable';
import FilterMenu from '@/components/course-filter/FilterMenu';
import PriorityModal from '@/components/course-filter/PriorityModal';
import Sidebar from '@/components/course-filter/Sidebar';
import ScheduleView from '@/components/course-filter/ScheduleView';
import ConflictWarning from '@/components/course-filter/ConflictWarning';
import useCourseData from '@/hooks/useCourseData';
import useFiltering from '@/hooks/useFiltering';
import useSorting from '@/hooks/useSorting';
import { CourseRow } from '@/types/course';
import Image from 'next/image';
import { FaGithub, FaStar, FaList, FaCalendarAlt } from 'react-icons/fa';

export default function CourseFilterPage() {
  const {
    rows,
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

  const [activeTab, setActiveTab] = useState<'list' | 'schedule'>('list');

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
    <div className="flex min-h-screen text-slate-100 font-sans selection:bg-indigo-500/30">

      {/* Absolute Background Effects */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse delay-1000" />
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
      />

      <main className="flex-1 p-4 h-screen overflow-y-auto custom-scrollbar relative">
        <ConflictWarning selectedCourses={starredCourses} />

        {/* Header Region */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4 animate-fade-in-down">
            <div className="relative group cursor-pointer">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <Image src="/course_koi.png" alt="Course Koi" width={64} height={64} className="rounded-full relative z-10 border-2 border-white/10" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">
                Course <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Koi?</span>
              </h1>
              <p className="text-gray-400 text-sm font-medium">Spring 2026 Scheduler</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggles */}
            <div className="glass p-1 rounded-lg flex items-center">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-indigo-600 shadow-lg text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <FaList /> List
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-indigo-600 shadow-lg text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <FaCalendarAlt /> Schedule
              </button>
            </div>

            <a
              href="https://github.com/maharun0/course-koi"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 hover:border-white/20"
            >
              <FaGithub className="mr-2 text-xl" />
              <span className="text-sm font-medium">Star on GitHub</span>
              <FaStar className="ml-2 text-yellow-400" />
            </a>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="animate-fade-in-up">
          {activeTab === 'list' ? (
            <>
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
              />
              <CourseTable
                sortedData={view === 'all' ? sortedData : starredSortedData}
                sorts={sorts}
                toggleSort={toggleSort}
                toggleStar={toggleStar}
                changePriority={changePriority}
                starredCourses={starredCourses}
              />
            </>
          ) : (
            <div className="w-full">
              <p className="text-gray-400 mb-4 px-2">Select from your <strong>Starred</strong> courses to build your weekly schedule.</p>
              <ScheduleView courses={starredCourses} />
            </div>
          )}
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
