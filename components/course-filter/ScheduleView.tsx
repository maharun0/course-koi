'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime } from '@/utils/timeUtils';
import { FaCopy, FaDownload, FaCheck, FaTimes } from 'react-icons/fa';
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
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('courseKoi_schedule');
        if (saved) {
            try {
                setSelectedCourses(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load schedule", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('courseKoi_schedule', JSON.stringify(selectedCourses));
        }
    }, [selectedCourses, isLoaded]);

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

    // --- POSITIONING LOGIC ---
    const START_OF_DAY = 8 * 60; // 08:00 AM
    const END_OF_DAY = 19 * 60 + 30; // 07:30 PM (End of last slot)
    const TOTAL_MINS = END_OF_DAY - START_OF_DAY;

    const getPosition = (start: number, end: number) => {
        const top = ((start - START_OF_DAY) / TOTAL_MINS) * 100;
        const height = ((end - start) / TOTAL_MINS) * 100;
        return { top: `${top}%`, height: `${height}%` };
    };

    const daySchedules = useMemo(() => {
        const temp: Record<string, { course: CourseRow; color: string; style: { top: string; height: string } }[]> = {};
        DAYS.forEach(d => (temp[d] = []));

        const colors = [
            'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
            'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'
        ];

        selectedCourses.forEach((course, idx) => {
            const schedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);
            if (!schedule) return;

            schedule.slots.forEach(slot => {
                const { top, height } = getPosition(slot.start, slot.end);
                // Clamp or check if out of bounds? User said "over border is fine".
                if (temp[slot.day]) {
                    temp[slot.day].push({
                        course,
                        color: colors[idx % colors.length],
                        style: { top, height }
                    });
                }
            });
        });
        return temp;
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
        <div className="flex flex-col lg:flex-row gap-4 w-full h-full">
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-xl text-white animate-fade-in-down flex items-center gap-3 pr-8 ${notification.type === 'error' ? 'bg-red-500/90 backdrop-blur' : 'bg-green-500/90 backdrop-blur'}`}>
                    {notification.type === 'success' && <FaCheck />}
                    <span className="font-medium text-sm">{notification.message}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <FaTimes size={12} />
                    </button>
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
                    <div className="flex-1 grid grid-cols-[80px_repeat(7,minmax(0,1fr))] bg-white/5 rounded-lg overflow-hidden border border-white/10 h-full relative">

                        {/* 1. Time Column */}
                        <div className="relative h-full border-r border-white/10 bg-black/20">
                            {/* Header */}
                            <div className="h-8 border-b border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-black/10 absolute w-full top-0 z-10">Time</div>

                            {/* Time Labels */}
                            <div className="absolute top-8 bottom-0 w-full">
                                {TIME_SLOTS.map((slot, i) => {
                                    const { top } = getPosition(slot.start, 0); // Height doesn't matter for label pos
                                    return (
                                        <div
                                            key={i}
                                            className="absolute w-full text-right pr-2 text-[10px] text-gray-400 font-mono -translate-y-1/2 flex items-center justify-end"
                                            style={{ top }}
                                        >
                                            <span className="bg-[#0f172a]/80 px-1 rounded">{slot.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Day Columns */}
                        {DAYS.map(day => (
                            <div key={day} className="relative h-full border-r border-white/10 last:border-r-0">
                                {/* Header */}
                                <div className="h-8 border-b border-white/10 flex items-center justify-center text-xs font-bold text-gray-200 bg-black/20 absolute w-full top-0 z-10">
                                    {day}
                                </div>

                                {/* Content Area */}
                                <div className="absolute top-8 bottom-0 w-full">
                                    {/* Background Grid Lines */}
                                    {TIME_SLOTS.map((slot, i) => {
                                        const { top } = getPosition(slot.start, 0);
                                        return (
                                            <div
                                                key={`line-${i}`}
                                                className="absolute w-full border-t border-white/5 pointer-events-none"
                                                style={{ top }}
                                            />
                                        );
                                    })}

                                    {/* Courses */}
                                    {daySchedules[day]?.map((item, i) => (
                                        <div
                                            key={i}
                                            className={`absolute inset-x-0 mx-0.5 rounded shadow-lg p-1 text-xs text-white border border-white/10 flex flex-col justify-center items-center hover:scale-[1.02] hover:z-20 transition-all cursor-default group overflow-hidden ${item.color}`}
                                            style={{
                                                top: item.style.top,
                                                height: item.style.height,
                                                minHeight: '20px' // Ensure visibility for short blocks
                                            }}
                                        >
                                            <div className="font-bold leading-tight text-center truncate w-full">{item.course.courseCode}</div>
                                            <div className="text-[9px] opacity-80 text-center truncate w-full">Sec {item.course.section}</div>
                                            <div className="hidden sm:block text-[8px] opacity-60 text-center uppercase tracking-wide group-hover:opacity-100 transition-opacity truncate w-full">{item.course.room}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
