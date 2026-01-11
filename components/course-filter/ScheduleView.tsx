'use client';

import { useMemo } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime, DayToIndex } from '@/utils/timeUtils';

interface ScheduleViewProps {
    courses: CourseRow[];
}

export default function ScheduleView({ courses }: ScheduleViewProps) {
    const eventSlots = useMemo(() => {
        const slots: {
            day: number;
            start: number;
            end: number;
            course: CourseRow;
            color: string;
        }[] = [];

        const colors = [
            'bg-blue-500/80',
            'bg-purple-500/80',
            'bg-pink-500/80',
            'bg-indigo-500/80',
            'bg-teal-500/80',
            'bg-orange-500/80',
        ];

        courses.forEach((course, idx) => {
            const schedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);
            if (schedule) {
                schedule.slots.forEach((s) => {
                    slots.push({
                        day: DayToIndex[s.day],
                        start: s.start,
                        end: s.end,
                        course,
                        color: colors[idx % colors.length],
                    });
                });
            }
        });

        return slots;
    }, [courses]);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startHour = 8;
    const endHour = 20; // 8 PM
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Helper to calculate position styles
    const getStyle = (start: number, end: number) => {
        const startOffset = (start - startHour * 60) * (50 / 60); // 50px per hour
        const height = (end - start) * (50 / 60);
        return {
            top: `${startOffset}px`,
            height: `${height}px`,
        };
    };

    return (
        <div className="glass rounded-xl p-6 overflow-x-auto w-full">
            <h2 className="text-xl font-bold mb-4 text-white">Weekly Schedule</h2>
            <div className="min-w-[800px] relative">
                {/* Header */}
                <div className="grid grid-cols-7 gap-2 mb-2 sticky top-0 z-10">
                    <div className="text-right pr-2 text-sm text-gray-400">Time</div>
                    {days.map((d) => (
                        <div key={d} className="text-center font-bold text-gray-200">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="relative grid grid-cols-7 gap-2">
                    {/* Time Labels */}
                    <div className="relative " style={{ height: `${hours.length * 50}px` }}>
                        {hours.map((h) => (
                            <div
                                key={h}
                                className="absolute w-full text-right pr-2 text-xs text-gray-500 -mt-2"
                                style={{ top: `${(h - startHour) * 50}px` }}
                            >
                                {h}:00
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {days.map((_, dayIndex) => (
                        <div
                            key={dayIndex}
                            className="relative border-l border-white/10"
                            style={{ height: `${hours.length * 50}px` }}
                        >
                            {/* Background Lines */}
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    className="absolute w-full border-t border-white/5"
                                    style={{ top: `${(h - startHour) * 50}px` }}
                                />
                            ))}

                            {/* Events */}
                            {eventSlots
                                .filter((e) => e.day === dayIndex + 1)
                                .map((e, i) => (
                                    <div
                                        key={`${e.course.id}-${i}`}
                                        className={`absolute w-[95%] left-[2.5%] rounded p-1 text-xs text-white shadow-sm hover:z-20 transition-all cursor-pointer ${e.color} border border-white/20`}
                                        style={getStyle(e.start, e.end)}
                                        title={`${e.course.courseCode} ${e.course.time}`}
                                    >
                                        <div className="font-bold truncate">{e.course.courseCode}</div>
                                        <div className="truncate opacity-90">{e.course.room}</div>
                                    </div>
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
