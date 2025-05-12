'use client';

import { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { CourseRow } from '@/types/course';

interface SidebarProps {
  savedCourses: CourseRow[];
  setSavedCourses: (courses: CourseRow[]) => void;
  courseOptions: string[];
  addCourse: () => void;
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
  inputCourse,
  setInputCourse,
  view,
  setView,
  activeCourse,
  setActiveCourse,
//   selectedStarredCourses,
  setSelectedStarredCourses,
  showDialog,
//   setShowDialog,
//   coursePriorities,
  setCoursePriorities,
}: SidebarProps) {
  const [dragging, setDragging] = useState<string | null>(null);

  const handleSelectCourse = (course: string) => {
    if (course === 'All Courses') {
      setActiveCourse(null);
      setInputCourse('');
      setSelectedStarredCourses([]);
    } else {
      setActiveCourse(course);
      setInputCourse('');
    }
  };

  const handleRemoveCourse = (course: string) => {
    setSavedCourses(savedCourses.filter((c) => c.courseCode !== course));
  };

  const handleDragStart = (course: string) => {
    setDragging(course);
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleDrop = (course: string) => {
    if (!dragging) return;
    const newOrder = savedCourses.filter((c) => c.courseCode !== dragging);
    const index = newOrder.findIndex((c) => c.courseCode === course);
    if (index === -1) return;
    newOrder.splice(index, 0, savedCourses.find((c) => c.courseCode === dragging)!);
    setSavedCourses(newOrder);
    setDragging(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputCourse) {
      addCourse();
    }
  };

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 m-4 p-4 space-y-6 bg-gray-800/80 backdrop-blur rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold">Course Management</h2>
      <div className="space-y-2">
        <button
          onClick={() => {
            setView('all');
            handleSelectCourse('All Courses');
          }}
          className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
            view === 'all' && !activeCourse ? 'bg-indigo-500 text-white' : ''
          } cursor-pointer`}
        >
          All Courses
        </button>
        {savedCourses.length === 0 && <p className="text-sm opacity-70 text-gray-400">No saved courses.</p>}
        {savedCourses.map((c) => (
          <button
            key={c.courseCode}
            onClick={() => {
              setView('all');
              handleSelectCourse(c.courseCode);
            }}
            onDragStart={() => handleDragStart(c.courseCode)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(c.courseCode)}
            draggable
            className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
              view === 'all' && activeCourse === c.courseCode ? 'bg-indigo-500 text-white' : ''
            } flex justify-between items-center cursor-pointer`}
          >
            {c.courseCode}
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveCourse(c.courseCode);
              }}
              className="text-sm text-red-500 cursor-pointer"
            >
              ❌
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setView('starred');
            setActiveCourse(null);
            setSelectedStarredCourses([]);
          }}
          className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${
            view === 'starred' ? 'bg-indigo-500 text-white' : ''
          } flex items-center cursor-pointer`}
        >
          <FaStar className="mr-2 text-yellow-400" />
          Starred Sections
        </button>
      </div>
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium">Add Course</h3>
        <input
          type="text"
          value={inputCourse}
          onChange={(e) => setInputCourse(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Search & add course"
          className="w-full border rounded p-2 bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
        />
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {courseOptions
            .filter((course) => course.toLowerCase().includes(inputCourse.toLowerCase()))
            .map((course) => (
              <li
                key={course}
                onClick={() => setInputCourse(course)}
                className="cursor-pointer hover:bg-indigo-500/20 px-3 py-2"
              >
                {course}
              </li>
            ))}
        </ul>
        <button
          onClick={addCourse}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-50 cursor-pointer"
          disabled={!inputCourse || savedCourses.some((c) => c.courseCode === inputCourse)}
        >
          Add
        </button>
        <button
          onClick={() => setCoursePriorities({})}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 hover:text-white mt-2"
        >
          Clear All Priorities
        </button>
      </div>
      {showDialog === 'added' && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
          Course Added!
        </div>
      )}
      {showDialog === 'error' && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg">
          Course not found. Enter the course correctly.
        </div>
      )}
      {showDialog === 'cleared' && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
          All priorities cleared!
        </div>
      )}
    </aside>
  );
}