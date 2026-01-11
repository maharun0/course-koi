'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime } from '@/utils/timeUtils';
import { FaCopy, FaDownload, FaCheck } from 'react-icons/fa';
import html2canvas from 'html2canvas';

interface ScheduleViewProps {
    courses: CourseRow[];
}

// Define the standard time slots requested
const TIME_SLOTS = [
    { label: "08:00 AM", start: 8 * 60, end: 9 * 60 + 30 },
    { label: "09:40 AM", start: 9 * 60 + 40, end: 11 * 60 + 10 },
    { label: "11:20 AM", start: 11 * 60 + 20, end: 12 * 60 + 50 },
    { label: "01:00 PM", start: 13 * 60, end: 14 * 60 + 30 },
    { label: "02:40 PM", start: 14 * 60 + 40, end: 16 * 60 + 10 },
    { label: "04:20 PM", start: 16 * 60 + 20, end: 17 * 60 + 50 },
    { label: "06:00 PM", start: 18 * 60, end: 19 * 60 + 30 },
];

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function ScheduleView({ courses }: ScheduleViewProps) {
    const [selectedCourses, setSelectedCourses] = useState<CourseRow[]>([]);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const scheduleRef = useRef<HTMLDivElement>(null);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleCourseSelect = (course: CourseRow) => {
        // 1. Toggle Off if already selected
        if (selectedCourses.some(c => c.id === course.id)) {
            setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
            return;
        }

        // 2. Prepare Swap if another section exists
        const sameCourseIndex = selectedCourses.findIndex(c => c.courseCode === course.courseCode);

        // 3. Conflict Detection
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

        // 4. Update State
        if (sameCourseIndex !== -1) {
            const newSelection = [...selectedCourses];
            newSelection[sameCourseIndex] = course;
            setSelectedCourses(newSelection);
        } else {
            setSelectedCourses([...selectedCourses, course]);
        }
    };

    // --- MAPPING LOGIC ---
    // Map selected courses to grid cells
    const gridData = useMemo(() => {
        const grid: Record<string, { course: CourseRow; color: string }[]> = {};

        // Initialize grid
        DAYS.forEach(d => {
            for (let i = 0; i < TIME_SLOTS.length; i++) {
                grid[`${d}-${i}`] = [];
            }
        });

        const colors = [
            'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
            'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'
        ];

        selectedCourses.forEach((course, idx) => {
            const schedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);
            if (!schedule) return;

            schedule.slots.forEach(slot => {
                // Find matching time slot (fuzzy match +/- 15 mins)
                const slotIndex = TIME_SLOTS.findIndex(ts =>
                    Math.abs(ts.start - slot.start) < 30 // 30 min tolerance
                );

                if (slotIndex !== -1) {
                    const key = `${slot.day}-${slotIndex}`;
                    if (!grid[key]) grid[key] = []; // Safety init
                    grid[key].push({
                        course,
                        color: colors[idx % colors.length]
                    });
                }
            });
        });

        return grid;
    }, [selectedCourses]);

    // --- ACTIONS ---

    const copyRoutine = () => {
        let text = "My Schedule\n\n";
        text += "Course    Sec   Fac   Time\n";
        text += "----------------------------------------\n";
        selectedCourses.forEach(c => {
            text += `${c.courseCode.padEnd(9)} ${c.section.padEnd(5)} ${c.facultyCode.padEnd(5)} ${c.time}\n`;
        });
        navigator.clipboard.writeText(text);
        setNotification({ message: "Routine copied to clipboard!", type: "success" });
    };

    const downloadImage = async () => {
        if (!scheduleRef.current) return;
        try {
            const canvas = await html2canvas(scheduleRef.current, {
                scale: 2,
                backgroundColor: '#0f172a',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
            const link = document.createElement('a');
            link.download = 'my-schedule.png';
            link.href = canvas.toDataURL();
            link.click();
            setNotification({ message: "Schedule downloaded!", type: "success" });
        } catch (e) {
            console.error(e);
            setNotification({ message: "Failed to download image.", type: "error" });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full h-[calc(100vh-180px)]">
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded-lg shadow-xl text-white animate-fade-in-down flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {notification.type === 'success' && <FaCheck />}
                    {notification.message}
                </div>
            )}

            {/* Left: Schedule Grid */}
            <div className="flex-1 glass rounded-xl p-4 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-xl font-bold text-white">Weekly Schedule</h2>
                    <div className="flex gap-2">
                        <button onClick={copyRoutine} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white">
                            <FaCopy /> Copy Text
                        </button>
                        <button onClick={downloadImage} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors text-white">
                            <FaDownload /> Save PNG
                        </button>
                    </div>
                </div>

                {/* The Grid Container - Capture Target */}
                <div ref={scheduleRef} className="p-4 bg-[#0f172a] rounded-lg border border-white/5 w-full h-full flex flex-col">
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] grid-rows-[auto_repeat(7,1fr)] bg-white/5 rounded-lg overflow-hidden border border-white/10 h-full">
                        {/* Header Row */}
                        <div className="bg-black/20 p-2 border-r border-b border-white/10 text-center font-bold text-gray-400 text-xs uppercase tracking-wider flex items-center justify-center">
                            Time
                        </div>
                        {DAYS.map(day => (
                            <div key={day} className="bg-black/20 p-2 border-r border-b border-white/10 text-center font-bold text-gray-200 last:border-r-0 flex items-center justify-center">
                                {day}
                            </div>
                        ))}

                        {/* Slots Rows */}
                        {TIME_SLOTS.map((slot, slotIdx) => (
                            <>
                                {/* Time Label Cell */}
                                <div key={`time-${slotIdx}`} className="bg-black/10 p-1 border-r border-b border-white/10 flex flex-col justify-center items-center text-[10px] text-gray-400 font-mono text-center leading-tight">
                                    <span className="block font-semibold">{slot.label}</span>
                                </div>

                                {/* Day Cells */}
                                {DAYS.map(day => {
                                    const cellData = gridData[`${day}-${slotIdx}`];
                                    return (
                                        <div key={`${day}-${slotIdx}`} className="border-r border-b border-white/5 bg-transparent p-1 relative last:border-r-0">
                                            {cellData && cellData.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`${item.color} w-full h-full rounded shadow-lg p-1 text-xs text-white border border-white/10 flex flex-col justify-center items-center hover:scale-[1.02] transition-transform cursor-default group overflow-hidden`}
                                                >
                                                    <div className="font-bold leading-tight text-center truncate w-full">{item.course.courseCode}</div>
                                                    <div className="text-[9px] opacity-80 text-center truncate w-full">Sec {item.course.section}</div>
                                                    <div className="hidden sm:block text-[8px] opacity-60 text-center uppercase tracking-wide group-hover:opacity-100 transition-opacity truncate w-full">{item.course.room}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </>
                        ))}
                    </div>

                    {/* Footer Logo for Screenshot */}
                    <div className="text-right mt-1 text-gray-600 text-[9px] font-mono opacity-50 shrink-0">
                        Generated by Course Koi?
                    </div>
                </div>
            </div>

            {/* Right: Starred Sections Sidebar */}
            <div className="w-full lg:w-64 glass rounded-xl p-4 flex flex-col shrink-0 lg:h-full h-auto max-h-[400px] lg:max-h-full">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between uppercase tracking-wider">
                    Starred
                    <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs">{courses.length}</span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {courses.length === 0 && (
                        <p className="text-gray-500 text-xs text-center py-8">Star courses from the list to see them here.</p>
                    )}
                    {courses.map(course => {
                        const isSelected = selectedCourses.some(c => c.id === course.id);
                        const isOtherSectionSelected = !isSelected && selectedCourses.some(c => c.courseCode === course.courseCode);

                        return (
                            <button
                                key={course.id}
                                onClick={() => handleCourseSelect(course)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 group relative ${isSelected
                                    ? 'bg-indigo-600/90 border-indigo-500 shadow-md transform scale-[1.02]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'group-hover:text-gray-200'}`}>
                                        {course.courseCode}
                                    </span>
                                    <span className={`text-[10px] px-1.5 rounded ${isSelected ? 'bg-black/20 text-indigo-100' : 'bg-black/20 text-gray-500'}`}>
                                        {course.section}
                                    </span>
                                </div>
                                <div className="text-[10px] opacity-80 truncate">
                                    {course.time}
                                </div>
                                {isOtherSectionSelected && (
                                    <div className="absolute top-1/2 -translate-y-1/2 right-2 w-1.5 h-1.5 rounded-full bg-yellow-500" title="Alt section selected" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
