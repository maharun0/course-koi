'use client';

import { FaStar, FaSortUp, FaSortDown, FaSort, FaClock, FaMapMarkerAlt, FaChalkboardTeacher, FaChair } from 'react-icons/fa';
import { CourseRow, SortKey, SortConfig } from '@/types/course';
import { seatAvailabilityColor } from '@/utils/courseDisplay';

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
      {/* Borderless table: interior rules only, no outer box/shadow-2xl card.
          No nested horizontal-scroll wrapper here — that would itself become
          a scroll container (overflow-x non-visible forces overflow-y:auto
          per spec) and break the sticky thead's reference to the real
          scrolling ancestor. Horizontal scroll is handled by the parent. */}
      <div className="hidden md:block">
          <table className="w-full text-center">
            <thead className="border-b border-rule bg-canvas sticky top-0 z-10">
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

      {/* Mobile Card View — ranked hierarchy instead of one flat size:
          course (biggest, boldest) > time (the one fact that answers "do I
          need to be somewhere") > room/faculty (supporting) > seats/priority
          (smallest, least urgent). Still far more compact than the original
          2x2-boxed-grid card, but text sizes are chosen for legibility, not
          just density. */}
      <div className="md:hidden space-y-2">
        {sortedData.map((r) => {
          const isStarred = starredCourses.some((c) => c.id === r.id);
          return (
            <div key={r.id} className="glass rounded-panel p-2.5 space-y-1 relative overflow-hidden">
              {/* Tier 1: course code + section badge + star — the primary identifier */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-lead text-ink tracking-tight truncate">{r.courseCode}</span>
                  <span className="shrink-0 px-2 h-6 flex items-center justify-center rounded-pill bg-accent/15 text-accent text-mini font-semibold tabular font-mono">
                    Sec {r.section}
                  </span>
                </div>
                <button
                  onClick={() => toggleStar(r)}
                  className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-pill ${isStarred ? 'text-accent bg-accent/10' : 'text-ink-3 bg-rule-soft'}`}
                >
                  <FaStar size={15} />
                </button>
              </div>

              {/* Tier 2: faculty + time, grouped adjacent — the most action-relevant facts */}
              <div className="flex items-center gap-3 text-body font-medium text-ink">
                <span className="flex items-center gap-1.5 shrink-0">
                  <FaChalkboardTeacher className="shrink-0 text-accent" size={14} />
                  {r.facultyCode}
                </span>
                <span className="flex items-center gap-1.5 min-w-0 truncate">
                  <FaClock className="shrink-0 opacity-60" size={14} />
                  <span className="truncate">{r.time}</span>
                </span>
              </div>

              {/* Tier 3: room + seats (left), priority (right) — supporting detail,
                  sharing one row since the grouped layout above leaves room */}
              <div className="flex items-center justify-between gap-2 text-mini text-ink-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <FaMapMarkerAlt className="shrink-0 opacity-60" size={12} />
                    {r.room}
                  </span>
                  <span className={`flex items-center gap-1.5 font-medium tabular font-mono text-body ${seatAvailabilityColor(r.seat)}`}>
                    <FaChair className="opacity-70" size={14} />
                    {r.seat}
                  </span>
                </div>
                <div className="flex items-center bg-raised rounded-control border border-rule overflow-hidden shrink-0">
                  <button
                    onClick={() => changePriority(r, (r.priority ?? 0) - 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-rule-soft text-ink-3 hover:text-ink transition-colors duration-150 ease-spring border-r border-rule"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    value={r.priority ?? 0}
                    onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
                    className="w-8 bg-transparent text-center text-ink focus:outline-none font-mono tabular text-mini"
                  />
                  <button
                    onClick={() => changePriority(r, (r.priority ?? 0) + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:bg-rule-soft text-ink-3 hover:text-ink transition-colors duration-150 ease-spring border-l border-rule"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
