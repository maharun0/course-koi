'use client';

import { FaStar, FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';
import { CourseRow, SortKey, SortConfig } from '@/types/course';

interface CourseTableProps {
  sortedData: CourseRow[];
  sorts: SortConfig[];
  toggleSort: (key: SortKey) => void;
  toggleStar: (course: CourseRow) => void;
  changePriority: (course: CourseRow, priority: number) => void;
  starredCourses: CourseRow[];
}

export default function CourseTable({
  sortedData,
  sorts,
  toggleSort,
  toggleStar,
  changePriority,
  starredCourses,
}: CourseTableProps) {

  // --- CENTRAL COLUMN WIDTH CONFIGURATION ---
  // Adjust these classes to control column widths
  const widths = {
    index: 'w-8',
    course: 'w-24',        // Header width for Course
    courseTruncate: 'max-w-[100px]', // Max width for content truncation (should match course width approx)
    section: 'w-16',
    faculty: 'w-20',
    time: 'w-24',      // Flexible width
    timeTruncate: 'max-w-[150px]',
    room: 'w-20',
    seat: 'w-16',
    priority: 'w-32',
  };
  // ------------------------------------------

  const getSortInfo = (key: SortKey) => {
    const sortIndex = sorts.findIndex((s) => s.key === key);
    if (sortIndex === -1) return { active: false };
    return {
      active: true,
      direction: sorts[sortIndex].dir,
      order: sortIndex + 1,
    };
  };

  const header = (label: string, key: SortKey, widthClass = "") => {
    const { active, direction, order } = getSortInfo(key);
    return (
      <th
        key={label}
        onClick={() => toggleSort(key)}
        className={`px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap ${widthClass}`}
      >
        <div className="flex items-center justify-center gap-2">
          {label}
          {active ? (
            <span className="text-indigo-400 flex items-center">
              {direction === 'asc' ? <FaSortUp /> : <FaSortDown />}
              {sorts.length > 1 && <span className="ml-1 text-[10px]">({order})</span>}
            </span>
          ) : (
            <FaSort className="opacity-20" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Helper Note (Mobile Only) */}
      <div className="md:hidden text-center text-xs text-gray-500 mb-2">
        Tip: Scroll horizontally for more columns
      </div>

      <div className="hidden md:block glass rounded-xl overflow-hidden shadow-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="bg-black/20 border-b border-white/10">
              <tr>
                <th className={`px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider ${widths.index}`}>#</th>
                {header('Course', 'courseCode', widths.course)}
                {header('Sec', 'section', widths.section)}
                {header('Fac', 'facultyCode', widths.faculty)}
                {header('Time', 'time', widths.time)}
                {header('Rm', 'room', widths.room)}
                {header('St', 'seat', widths.seat)}
                {header('Priority', 'priority', widths.priority)}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.slice(0, 100).map((r, idx) => {
                const isStarred = starredCourses.some((c) => c.id === r.id);
                return (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">{idx + 1}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className={`text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate overflow-hidden ${widths.courseTruncate}`} title={r.courseCode}>
                        {r.courseCode}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-300">{r.section}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-300">{r.facultyCode}</td>
                    <td className={`px-2 py-1 whitespace-nowrap text-xs text-gray-300 truncate overflow-hidden ${widths.timeTruncate}`} title={r.time}>{r.time}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-300">{r.room}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-300">{r.seat}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs">
                      <div className="flex items-center justify-center gap-2">
                        {/* Stepper for Priority */}
                        <div className="flex items-center bg-black/20 rounded-lg border border-white/10 overflow-hidden scale-90">
                          <button
                            onClick={() => changePriority(r, (r.priority ?? 0) - 1)}
                            className="px-2 py-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border-r border-white/5"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="-10"
                            max="10"
                            value={r.priority ?? 0}
                            onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                            className="w-8 bg-transparent text-center text-white focus:outline-none font-mono text-[10px] appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => changePriority(r, (r.priority ?? 0) + 1)}
                            className="px-2 py-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border-l border-white/5"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => toggleStar(r)}
                          className={`transition-all transform hover:scale-110 p-1 rounded-full hover:bg-white/10 ${isStarred ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-200'
                            }`}
                        >
                          <FaStar size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sortedData.length > 100 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-xs text-gray-500 italic border-t border-white/5">
                    Showing first 100 of {sortedData.length} courses. Use search/filters to find specific items.
                  </td>
                </tr>
              )}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg font-medium">No courses found</p>
                    <p className="text-sm">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedData.map((r) => {
          const isStarred = starredCourses.some((c) => c.id === r.id);
          return (
            <div key={r.id} className="glass rounded-xl p-4 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{r.courseCode}</h3>
                  <p className="text-sm text-gray-400">Section {r.section}</p>
                </div>
                <button
                  onClick={() => toggleStar(r)}
                  className={`p-2 rounded-full ${isStarred ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 bg-white/5'}`}
                >
                  <FaStar />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="block text-xs text-gray-500">Time</span>
                  <span className="text-gray-200">{r.time}</span>
                </div>
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="block text-xs text-gray-500">Room</span>
                  <span className="text-gray-200">{r.room}</span>
                </div>
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="block text-xs text-gray-500">Faculty</span>
                  <span className="text-gray-200">{r.facultyCode}</span>
                </div>
                <div className="bg-white/5 rounded px-3 py-2">
                  <span className="block text-xs text-gray-500">Seats</span>
                  <span className="text-gray-200">{r.seat}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                <span className="text-xs text-gray-500">Priority:</span>
                <input
                  type="number"
                  min="-10"
                  max="10"
                  value={r.priority ?? 0}
                  onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-black/20 border border-white/10 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
