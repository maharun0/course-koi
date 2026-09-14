'use client';

import { FaStar, FaBook } from 'react-icons/fa';

/**
 * The three-state course-list filter, shared by the Schedule tab's section list
 * and the List tab's table so both cycle through the same states in the same
 * order with the same labels.
 */
export type CourseListMode = 'starred' | 'all' | 'mine';

/**
 * The "all" mark is a bitmap rather than a glyph font, so it is painted as a
 * mask instead of an <img>: the PNG knocks the letters out of an opaque disc,
 * which means masking `bg-current` reproduces the mark exactly while letting it
 * inherit the same hover/active colours as the react-icons beside it.
 */
export function AllCoursesIcon({ size = 13 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block bg-current shrink-0"
      style={{
        width: size,
        height: size,
        maskImage: 'url(/all.png)',
        WebkitMaskImage: 'url(/all.png)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

export const COURSE_LIST_MODES: {
  mode: CourseListMode;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}[] = [
  { mode: 'starred', icon: FaStar, label: 'Showing starred sections' },
  { mode: 'all', icon: AllCoursesIcon, label: 'Showing all sections' },
  { mode: 'mine', icon: FaBook, label: 'Showing my courses' },
];

export function nextCourseListMode(mode: CourseListMode): CourseListMode {
  const i = COURSE_LIST_MODES.findIndex((m) => m.mode === mode);
  return COURSE_LIST_MODES[(i + 1) % COURSE_LIST_MODES.length].mode;
}

interface CourseListModeButtonProps {
  mode: CourseListMode;
  onChange: (next: CourseListMode) => void;
  /**
   * `panel` sits in the Schedule tab's section list, `toolbar` beside the List
   * tab's Filter button — same control, sized for the chassis around it.
   */
  variant?: 'panel' | 'toolbar';
}

/** Colour is owned here rather than passed in: `text-ink-2` and `text-accent`
 *  are the same Tailwind property in the same layer, so letting a caller append
 *  one to the other would leave the winner down to stylesheet order. */
const CHASSIS = {
  panel: 'shrink-0 w-9 h-9 bg-rule-soft',
  // Same padding as the Filter button it sits beside, and the icon is boxed to
  // text-body's 20px line height, so the two resolve to the same height without
  // either one hardcoding it.
  toolbar: 'shrink-0 px-2.5 py-2 bg-surface shadow-rest',
} as const;

export function CourseListModeButton({ mode, onChange, variant = 'panel' }: CourseListModeButtonProps) {
  const current = COURSE_LIST_MODES.find((m) => m.mode === mode) ?? COURSE_LIST_MODES[0];
  const Icon = current.icon;
  // "all" is the unfiltered resting state; the other two hide rows, so they get
  // an accent so an active filter is never silently in effect.
  const isFiltering = mode !== 'all';
  return (
    <button
      type="button"
      onClick={() => onChange(nextCourseListMode(mode))}
      title={`${current.label} — click to cycle`}
      aria-label={current.label}
      className={`${CHASSIS[variant]} flex items-center justify-center rounded-control border transition-colors duration-150 ease-spring cursor-pointer ${
        isFiltering
          ? 'border-accent text-accent hover:bg-accent/10'
          : 'border-rule text-ink-2 hover:text-ink hover:bg-rule-soft'
      }`}
    >
      <span className="h-5 flex items-center">
        <Icon size={14} />
      </span>
    </button>
  );
}
