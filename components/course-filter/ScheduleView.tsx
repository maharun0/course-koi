'use client';

import { useMemo, useState, useEffect } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime, DayToIndex } from '@/utils/timeUtils';

interface ScheduleViewProps {
    courses: CourseRow[];
}

export default function ScheduleView({ courses }: ScheduleViewProps) {
    const [selectedCourses, setSelectedCourses] = useState<CourseRow[]>([]);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Derived state for the grid
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

        selectedCourses.forEach((course, idx) => {
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
    }, [selectedCourses]);

    const handleCourseSelect = (course: CourseRow) => {
        // 1. Check if already selected -> Toggle Off
        if (selectedCourses.some(c => c.id === course.id)) {
            setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
            return;
        }

        // 2. Check if another section of the same course is selected -> Prepare to Swap
        const sameCourseIndex = selectedCourses.findIndex(c => c.courseCode === course.courseCode);

        // 3. Conflict Detection
        // Create a temporary list of courses to check against (excluding the one we might be swapping out)
        const coursesToCheck = selectedCourses.filter(c => c.courseCode !== course.courseCode);

        const newSchedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);
        if (!newSchedule) {
            setNotification({ message: "Invalid time format.", type: "error" });
            return;
        }

        let hasConflict = false;
        let conflictReason = "";

        for (const existing of coursesToCheck) {
            const existingSchedule = parseCourseTime(existing.time, existing.id, existing.courseCode, existing.section);
            if (!existingSchedule) continue;

            for (const newSlot of newSchedule.slots) {
                for (const existingSlot of existingSchedule.slots) {
                    if (newSlot.day === existingSlot.day) {
                        // Check overlap
                        if (Math.max(newSlot.start, existingSlot.start) < Math.min(newSlot.end, existingSlot.end)) {
                            hasConflict = true;
                            conflictReason = `Clashes with ${existing.courseCode}`;
                            break;
                        }
                    }
                }
                if (hasConflict) break;
            }
            if (hasConflict) break;
        }

        if (hasConflict) {
            setNotification({ message: conflictReason, type: 'error' });
            return;
        }

        // 4. Success - Update State
        if (sameCourseIndex !== -1) {
            // Swap
            const newSelection = [...selectedCourses];
            newSelection[sameCourseIndex] = course;
            setSelectedCourses(newSelection);
        } else {
            // Add
            setSelectedCourses([...selectedCourses, course]);
        }
    };

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
        <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-200px)]">
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-xl text-white animate-fade-in-down ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {notification.message}
                </div>
            )}

            {/* Left: Schedule Grid */}
            <div className="flex-1 glass rounded-xl p-6 overflow-y-auto custom-scrollbar relative">
                <h2 className="text-xl font-bold mb-4 text-white">Weekly Schedule</h2>
                <div className="min-w-[800px] relative">
                    {/* Header */}
                    <div className="grid grid-cols-7 gap-2 mb-2 sticky top-0 z-10 bg-black/40 backdrop-blur-sm py-2 rounded-t-lg border-b border-white/10">
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

            {/* Right: Starred Sections Sidebar */}
            <div className="w-full lg:w-80 glass rounded-xl p-4 flex flex-col shrink-0 h-full overflow-hidden">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    Starred Courses
                    <span className="text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">{courses.length}</span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {courses.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-8">No starred courses yet.</p>
                    )}
                    {courses.map(course => {
                        const isSelected = selectedCourses.some(c => c.id === course.id);
                        // Check if another section of this course is selected
                        const isOtherSectionSelected = !isSelected && selectedCourses.some(c => c.courseCode === course.courseCode);

                        return (
                            <button
                                key={course.id}
                                onClick={() => handleCourseSelect(course)}
                                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group relative ${isSelected
                                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold ${isSelected ? 'text-indigo-300' : 'text-gray-200'}`}>
                                        {course.courseCode}
                                    </span>
                                    <span className="text-xs text-gray-500 bg-black/20 px-1.5 py-0.5 rounded">
                                        Sec {course.section}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span>{course.time}</span>
                                </div>
                                {isOtherSectionSelected && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-500/50" title="Another section selected" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
