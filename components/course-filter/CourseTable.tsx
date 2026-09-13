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
    priority: 'w-24',
    star: 'w-10',
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
        className={`px-2 py-2 text-center text-mini font-semibold text-ink-3 uppercase tracking-wider cursor-pointer hover:text-ink transition-colors duration-150 ease-spring select-none whitespace-nowrap ${widthClass}`}
      >
        <div className="flex items-center justify-center gap-2">
          {label}
          {active ? (
            <span className="text-accent flex items-center">
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
      <div className="md:hidden text-center text-mini text-ink-3 mb-2">
        Tip: Scroll horizontally for more columns
      </div>

      {/* Borderless table: interior rules only, no outer box/shadow-2xl card */}
      <div className="hidden md:block rounded-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead className="border-b border-rule">
              <tr>
                <th className={`px-2 py-2 text-center text-mini font-semibold text-ink-3 uppercase tracking-wider ${widths.index}`}>#</th>
                {header('Course', 'courseCode', widths.course)}
                {header('Sec', 'section', widths.section)}
                {header('Fac', 'facultyCode', widths.faculty)}
                {header('Time', 'time', widths.time)}
                {header('Rm', 'room', widths.room)}
                {header('St', 'seat', widths.seat)}
                {header('Priority', 'priority', widths.priority)}
                <th className={`px-2 py-2 text-center text-mini font-semibold text-ink-3 uppercase tracking-wider ${widths.star}`}>Star</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {sortedData.slice(0, 100).map((r, idx) => {
                const isStarred = starredCourses.some((c) => c.id === r.id);
                return (
                  <tr key={r.id} className="hover:bg-rule-soft transition-colors duration-150 ease-spring group">
                    <td className="px-2 py-1 whitespace-nowrap text-mini text-ink-3 tabular font-mono">{idx + 1}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className={`text-mini font-bold text-ink group-hover:text-accent transition-colors duration-150 ease-spring truncate overflow-hidden ${widths.courseTruncate}`} title={r.courseCode}>
                        {r.courseCode}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini text-ink-2 tabular font-mono">{r.section}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini text-ink-2">{r.facultyCode}</td>
                    <td className={`px-2 py-1 whitespace-nowrap text-mini text-ink-2 truncate overflow-hidden ${widths.timeTruncate}`} title={r.time}>{r.time}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini text-ink-2">{r.room}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini text-ink-2 tabular font-mono">{r.seat}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini">
                      <div className="flex items-center justify-center">
                        {/* Stepper for Priority */}
                        <div className="flex items-center bg-raised rounded-control border border-rule overflow-hidden scale-90">
                          <button
                            onClick={() => changePriority(r, (r.priority ?? 0) - 1)}
                            className="px-2 py-1 hover:bg-rule-soft text-ink-3 hover:text-ink transition-colors duration-150 ease-spring border-r border-rule"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="-10"
                            max="10"
                            value={r.priority ?? 0}
                            onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                            className="w-8 bg-transparent text-center text-ink focus:outline-none font-mono tabular text-[10px] appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => changePriority(r, (r.priority ?? 0) + 1)}
                            className="px-2 py-1 hover:bg-rule-soft text-ink-3 hover:text-ink transition-colors duration-150 ease-spring border-l border-rule"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-mini">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => toggleStar(r)}
                          className={`transition-transform duration-150 ease-spring transform hover:scale-110 p-1 rounded-pill hover:bg-rule-soft ${isStarred ? 'text-accent' : 'text-ink-3 hover:text-accent'
                            }`}
                        >
                          <FaStar />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sortedData.length > 100 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-mini text-ink-3 italic border-t border-rule">
                    Showing first 100 of {sortedData.length} courses. Use search/filters to find specific items.
                  </td>
                </tr>
              )}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-ink-3">
                    <p className="text-lead font-medium">No courses found</p>
                    <p className="text-body">Try adjusting your filters or search query.</p>
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
            <div key={r.id} className="glass rounded-panel p-4 space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lead font-bold text-ink">{r.courseCode}</h3>
                  <p className="text-body text-ink-2">Section {r.section}</p>
                </div>
                <button
                  onClick={() => toggleStar(r)}
                  className={`p-2 rounded-pill ${isStarred ? 'text-accent bg-accent/10' : 'text-ink-3 bg-rule-soft'}`}
                >
                  <FaStar />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-body">
                <div className="bg-rule-soft rounded-control px-3 py-2">
                  <span className="block text-mini text-ink-3">Time</span>
                  <span className="text-ink-2">{r.time}</span>
                </div>
                <div className="bg-rule-soft rounded-control px-3 py-2">
                  <span className="block text-mini text-ink-3">Room</span>
                  <span className="text-ink-2">{r.room}</span>
                </div>
                <div className="bg-rule-soft rounded-control px-3 py-2">
                  <span className="block text-mini text-ink-3">Faculty</span>
                  <span className="text-ink-2">{r.facultyCode}</span>
                </div>
                <div className="bg-rule-soft rounded-control px-3 py-2">
                  <span className="block text-mini text-ink-3">Seats</span>
                  <span className="text-ink-2 tabular font-mono">{r.seat}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-rule mt-2">
                <span className="text-mini text-ink-3">Priority:</span>
                <input
                  type="number"
                  min="-10"
                  max="10"
                  value={r.priority ?? 0}
                  onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-raised border border-rule rounded-control px-2 py-1 text-center text-ink focus:outline-none focus:border-accent font-mono tabular text-body"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
