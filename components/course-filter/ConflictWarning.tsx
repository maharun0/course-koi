'use client';

import { useMemo } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime, detectConflicts } from '@/utils/timeUtils';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConflictWarningProps {
    selectedCourses: CourseRow[];
}

export default function ConflictWarning({ selectedCourses }: ConflictWarningProps) {
    const conflicts = useMemo(() => {
        const schedules = selectedCourses
            .map(c => parseCourseTime(c.time, c.id, c.courseCode, c.section))
            .filter((s): s is NonNullable<typeof s> => s !== null);

        return detectConflicts(schedules);
    }, [selectedCourses]);

    if (conflicts.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-red-500/90 backdrop-blur text-white px-6 py-4 rounded-lg shadow-xl border border-red-400 flex flex-col gap-2 max-w-md">
                <div className="flex items-center gap-3 font-bold text-lg">
                    <FaExclamationTriangle />
                    <span>Schedule Conflict Detected!</span>
                </div>
                <ul className="list-disc pl-8 text-sm space-y-1">
                    {conflicts.map((c, i) => (
                        <li key={i}>{c}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
