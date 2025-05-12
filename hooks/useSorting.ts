import { useState, useMemo } from 'react';
import { CourseRow, SortKey, SortConfig } from '@/types/course';
import { applyMultiSort } from '@/utils/sorting';

export default function useSorting(filteredData: CourseRow[], starredFilteredData: CourseRow[]) {
  const [sorts, setSorts] = useState<SortConfig[]>([]);

  const toggleSort = (key: SortKey) => {
    setSorts((prevSorts) => {
      const existingIndex = prevSorts.findIndex((s) => s.key === key);
      if (existingIndex >= 0) {
        const existing = prevSorts[existingIndex];
        const newSorts = [...prevSorts];
        switch (existing.dir) {
          case 'none':
            newSorts[existingIndex] = { key, dir: 'asc' };
            break;
          case 'asc':
            newSorts[existingIndex] = { key, dir: 'desc' };
            break;
          case 'desc':
            newSorts.splice(existingIndex, 1);
            break;
        }
        return newSorts;
      }
      return [...prevSorts, { key, dir: 'asc' }];
    });
  };

  const sortedData = useMemo(() => applyMultiSort(filteredData, sorts), [filteredData, sorts]);
  const starredSortedData = useMemo(() => applyMultiSort(starredFilteredData, sorts), [starredFilteredData, sorts]);

  return { sorts, toggleSort, sortedData, starredSortedData };
}