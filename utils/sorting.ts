import { CourseRow, SortConfig } from '@/types/course';

export function applyMultiSort(items: CourseRow[], sortConfigs: SortConfig[]): CourseRow[] {
  if (sortConfigs.length === 0) return items;

  return [...items].sort((a, b) => {
    for (const sort of sortConfigs) {
      if (sort.dir === 'none') continue;
      const k = sort.key as keyof CourseRow;
      let v1: string | number | boolean | undefined = a[k];
      let v2: string | number | boolean | undefined = b[k];

      if (k === 'priority') {
        v1 = v1 === undefined ? 0 : v1;
        v2 = v2 === undefined ? 0 : v2;
        const n1 = v1 as number;
        const n2 = v2 as number;
        if (n1 < n2) return sort.dir === 'asc' ? -1 : 1;
        if (n1 > n2) return sort.dir === 'asc' ? 1 : -1;
        continue;
      }

      if (k === 'starred') {
        const b1 = v1 === true;
        const b2 = v2 === true;
        if (b1 !== b2) {
          return sort.dir === 'asc' ? (b1 ? 1 : -1) : b1 ? -1 : 1;
        }
        continue;
      }

      if (k === 'section') {
        const s1 = v1 as string;
        const s2 = v2 as string;
        const n1 = parseInt(s1, 10);
        const n2 = parseInt(s2, 10);
        if (!isNaN(n1) && !isNaN(n2)) {
          if (n1 < n2) return sort.dir === 'asc' ? -1 : 1;
          if (n1 > n2) return sort.dir === 'asc' ? 1 : -1;
          continue;
        }
      }

      if (k === 'time') {
        const t1 = v1 as string;
        const t2 = v2 as string;
        const dayPattern1 = t1.substring(0, 2);
        const dayPattern2 = t2.substring(0, 2);
        const dayPriority: Record<string, number> = { MW: 1, RA: 2, ST: 3 };

        if (dayPattern1 !== dayPattern2) {
          const priority1 = dayPriority[dayPattern1] || 999;
          const priority2 = dayPriority[dayPattern2] || 999;
          if (priority1 < priority2) return sort.dir === 'asc' ? -1 : 1;
          if (priority1 > priority2) return sort.dir === 'asc' ? 1 : -1;
        }

        const isAM1 = t1.includes('AM');
        const isAM2 = t2.includes('AM');
        const isPM1 = t1.includes('PM');
        const isPM2 = t2.includes('PM');

        if (isAM1 && isPM2) return sort.dir === 'asc' ? -1 : 1;
        if (isPM1 && isAM2) return sort.dir === 'asc' ? 1 : -1;

        const hourMatch1 = t1.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
        const hourMatch2 = t2.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);

        if (hourMatch1 && hourMatch2) {
          const hour1 = parseInt(hourMatch1[1], 10);
          const hour2 = parseInt(hourMatch2[1], 10);

          if (hour1 < hour2) return sort.dir === 'asc' ? -1 : 1;
          if (hour1 > hour2) return sort.dir === 'asc' ? 1 : -1;
        }
        continue;
      }

      // Handle string comparison for other fields
      const s1 = typeof v1 === 'string' ? v1.toLowerCase() : String(v1);
      const s2 = typeof v2 === 'string' ? v2.toLowerCase() : String(v2);

      if (s1 < s2) return sort.dir === 'asc' ? -1 : 1;
      if (s1 > s2) return sort.dir === 'asc' ? 1 : -1;
    }
    return 0;
  });
}