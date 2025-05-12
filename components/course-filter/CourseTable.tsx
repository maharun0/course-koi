'use client';

import { FaStar } from 'react-icons/fa';
import { CourseRow, SortKey, SortConfig } from '@/types/course';

interface CourseTableProps {
  view: 'all' | 'starred';
  sortedData: CourseRow[];
  sorts: SortConfig[];
  toggleSort: (key: SortKey) => void;
  toggleStar: (course: CourseRow) => void;
  changePriority: (course: CourseRow, priority: number) => void;
  starredCourses: CourseRow[];
}

export default function CourseTable({
  view,
  sortedData,
  sorts,
  toggleSort,
  toggleStar,
  changePriority,
  starredCourses,
}: CourseTableProps) {
  const getSortInfo = (key: SortKey) => {
    const sortIndex = sorts.findIndex((s) => s.key === key);
    if (sortIndex === -1) return { active: false };
    return {
      active: true,
      direction: sorts[sortIndex].dir,
      order: sortIndex + 1,
    };
  };

  const header = (label: string, key: SortKey) => (
    <th
      key={label}
      onClick={() => toggleSort(key)}
      className="px-4 py-2 text-left text-sm font-semibold cursor-pointer select-none hover:underline text-inherit"
    >
      {label}
      {getSortInfo(key).active && getSortInfo(key).direction !== 'none' && (
        <span>
          {` ${getSortInfo(key).direction === 'asc' ? '↑' : '↓'}`}
          {sorts.length > 1 && ` (${getSortInfo(key).order})`}
        </span>
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full shadow rounded bg-white dark:bg-gray-800">
        <thead className="bg-gray-200 dark:bg-gray-700">
          <tr>
            {header('#', 'index')}
            {header('Course', 'courseCode')}
            {header('Section', 'section')}
            {header('Faculty', 'facultyCode')}
            {header('Time', 'time')}
            {header('Room', 'room')}
            {header('Seats', 'seat')}
            {header('Priority', 'priority')}
            {header('Star', 'starred')}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((r, idx) => (
            <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-4 py-2">{idx + 1}</td>
              <td className="px-4 py-2">{r.courseCode}</td>
              <td className="px-4 py-2">{r.section}</td>
              <td className="px-4 py-2">{r.facultyCode}</td>
              <td className="px-4 py-2 whitespace-nowrap">{r.time}</td>
              <td className="px-4 py-2">{r.room}</td>
              <td className="px-4 py-2">{r.seat}</td>
              <td className="px-4 py-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    value={r.priority ?? 0}
                    onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                    className="w-12 h-8 text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </td>
              <td className="px-4 py-2">
                <FaStar
                  className={`cursor-pointer ${
                    starredCourses.some((c) => c.id === r.id) ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                  onClick={() => toggleStar(r)}
                />
              </td>
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-gray-400 dark:text-gray-500">
                {view === 'all' ? 'No matching records.' : 'No starred courses.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}