import { useState, useEffect, useMemo } from 'react';
import { CourseRow } from '@/types/course';
import { useLocalStorage } from './useLocalStorage';

export default function useCourseData() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [savedCourses, setSavedCourses] = useLocalStorage<CourseRow[]>('savedCourses', []);
  const [starredCourses, setStarredCourses] = useLocalStorage<CourseRow[]>('starredCourses', []);
  const [coursePriorities, setCoursePriorities] = useLocalStorage<Record<string, number>>('coursePriorities', {});
  const [inputCourse, setInputCourse] = useState('');
  const [showDialog, setShowDialog] = useState<string | null>(null);

  useEffect(() => {
    fetch('/courses.csv')
      .then((r) => r.text())
      .then((txt) => {
        const parsed: CourseRow[] = txt
          .trim()
          .split(/\r?\n/)
          .slice(1)
          .filter(Boolean)
          .map((ln) => ln.split(',').map((c) => c.trim()))
          .map((c) => ({
            id: `${c[0]}-${c[2]}`,
            courseCode: c[0],
            credit: Number(c[1]),
            section: c[2],
            facultyCode: c[3],
            days: c[4],
            time: `${c[4]} ${c[5]}`,
            room: c[6],
            seat: Number(c[7]),
          }));
        setRows(parsed);
      });
  }, []);

  const courseOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.courseCode))).sort(), [rows]);

  const addCourse = () => {
    const upperCaseCourse = inputCourse.toUpperCase().trim();
    const courseToAdd = rows.find((r) => r.courseCode.toUpperCase() === upperCaseCourse);
    if (courseToAdd && !savedCourses.some((saved) => saved.courseCode === courseToAdd.courseCode)) {
      setSavedCourses([...savedCourses, courseToAdd]);
      setInputCourse('');
      setShowDialog('added');
      setTimeout(() => setShowDialog(null), 3000);
    } else {
      setShowDialog('error');
      setTimeout(() => setShowDialog(null), 3000);
    }
  };

  return {
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
  };
}