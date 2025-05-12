export interface CourseRow {
  id: string;
  courseCode: string;
  credit: number;
  section: string;
  facultyCode: string;
  days: string;
  time: string;
  room: string;
  seat: number;
  priority?: number;
  starred?: boolean;
}

export type SortKey = keyof CourseRow | 'index';
export type SortDirection = 'none' | 'asc' | 'desc';

export interface SortConfig {
  key: SortKey;
  dir: SortDirection;
}