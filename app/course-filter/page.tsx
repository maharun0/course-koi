'use client';

import Image from 'next/image';
import { FaGithub, FaStar } from 'react-icons/fa';
import Sidebar from '@/components/course-filter/Sidebar';
import CourseTable from '@/components/course-filter/CourseTable';
import FilterMenu from '@/components/course-filter/FilterMenu';
import PriorityModal from '@/components/course-filter/PriorityModal';
import useCourseData from '@/hooks/useCourseData';
import useSorting from '@/hooks/useSorting';
import useFiltering from '@/hooks/useFiltering';
import { CourseRow } from '@/types/course';

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
    <div className="flex min-h-screen transition-colors">
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
      <main className="flex-1 p-6 space-y-6 relative">
        <div className="flex items-center justify-center relative">
          <div className="flex items-center">
            <Image src="/course_koi.png" alt="Course Koi" width={64} height={64} className="rounded-full mr-4" />
            <h1 className="text-5xl font-bold text-[#FBB949)">Course Koi?</h1>
          </div>
          <a
            href="https://github.com/maharun0/course-koi"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 top-0 flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <FaGithub className="mr-2 text-lg" />
            <span className="text-sm">Star project on GitHub</span>
            <FaStar className="ml-2 text-yellow-400" />
          </a>
        </div>
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
          view={view}
          sortedData={view === 'all' ? sortedData : starredSortedData}
          sorts={sorts}
          toggleSort={toggleSort}
          toggleStar={toggleStar}
          changePriority={changePriority}
          starredCourses={starredCourses}
        />
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