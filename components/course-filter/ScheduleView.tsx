'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime } from '@/utils/timeUtils';
import { FaCopy, FaDownload, FaCheck, FaTimes, FaClipboard, FaFileImport, FaPaste } from 'react-icons/fa';
import { toPng, toBlob } from 'html-to-image';

interface ScheduleViewProps {
    courses: CourseRow[]; // This represents starred courses
    allCourses: CourseRow[]; // New prop for all courses
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

export default function ScheduleView({ courses, allCourses }: ScheduleViewProps) {
    const [selectedCourses, setSelectedCourses] = useState<CourseRow[]>([]);
    const [sidebarTab, setSidebarTab] = useState<'courses' | 'custom'>('courses');
    const [searchTerm, setSearchTerm] = useState('');

    // Custom Event State
    const [customTag, setCustomTag] = useState('');
    const [customDays, setCustomDays] = useState<string[]>([]);
    const [customStartTime, setCustomStartTime] = useState('08:00');
    const [customEndTime, setCustomEndTime] = useState('10:00');

    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const scheduleRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');

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

    const handleCourseSelect = (course: CourseRow): boolean => {
        // 1. Toggle Off if already selected (Removal)
        if (selectedCourses.some(c => c.id === course.id)) {
            setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
            return false; // Removed, so not "added"
        }

        const isCustom = course.section === 'Custom';

        // 2. Prepare Swap (Only for non-custom courses)
        // For custom events, we never swap, we allow multiples (unless they clash)
        const sameCourseIndex = isCustom ? -1 : selectedCourses.findIndex(c => c.courseCode === course.courseCode);

        // 3. Conflict Detection
        // For Custom: Check against ALL courses including other "Work" blocks.
        // For Regular: Ignore same courseCode because we are about to swap it anyway.
        const coursesToCheck = selectedCourses.filter(c =>
            isCustom ? c.id !== course.id : c.courseCode !== course.courseCode
        );

        const newSchedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);

        if (!newSchedule) {
            setNotification({ message: "Invalid time format.", type: "error" });
            return false;
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
                            // For custom events with same name, make message clear
                            const name = existing.id === course.id ? "itself" : existing.courseCode;
                            conflictReason = `Clashes with ${name} (${existing.section === 'Custom' ? 'Custom' : 'Section ' + existing.section})`;
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
            return false;
        }

        // 4. Update State
        if (sameCourseIndex !== -1) {
            const newSelection = [...selectedCourses];
            newSelection[sameCourseIndex] = course;
            setSelectedCourses(newSelection);
        } else {
            setSelectedCourses([...selectedCourses, course]);
        }
        return true;
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

    // --- PREVIEW LOGIC ---
    const previewCourse = useMemo(() => {
        if (sidebarTab !== 'custom' || customDays.length === 0) return null;

        // Format Time to 12h for parser (Shared logic)
        const formatTime = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const dayMap: Record<string, string> = { 'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'R', 'Fri': 'F', 'Sat': 'A', 'Sun': 'S' };
        const dayString = customDays.map(d => dayMap[d]).join('');
        const timeString = `${dayString} ${formatTime(customStartTime)} - ${formatTime(customEndTime)}`;

        return {
            id: 'preview-custom',
            courseCode: customTag || 'Preview',
            section: 'Custom',
            facultyCode: '',
            time: timeString,
            room: '',
            seat: 0,
            credit: 0,
            days: dayString,
        } as CourseRow;
    }, [sidebarTab, customDays, customStartTime, customEndTime, customTag]);

    const daySchedules = useMemo(() => {
        const temp: Record<string, { course: CourseRow; color: string; isPreview?: boolean; style: { top: string; height: string } }[]> = {};
        DAYS.forEach(d => (temp[d] = []));

        const colors = [
            'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
            'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'
        ];

        // Combine selected courses with preview (if exists)
        const coursesToRender = [...selectedCourses];
        if (previewCourse) {
            coursesToRender.push(previewCourse);
        }

        coursesToRender.forEach((course, idx) => {
            const isPreview = course.id === 'preview-custom';
            const schedule = parseCourseTime(course.time, course.id, course.courseCode, course.section);
            if (!schedule) return;

            // Determine Color
            let color = isPreview ? 'bg-gray-500' : colors[idx % colors.length];
            if (course.courseCode.toLowerCase() === 'work') {
                color = 'bg-yellow-500 text-black'; // Work is yellow
            } else if (!isPreview && course.section === 'Custom') {
                color = 'bg-gray-600'; // Other customs default
            }

            schedule.slots.forEach(slot => {
                const { top, height } = getPosition(slot.start, slot.end);
                if (temp[slot.day]) {
                    temp[slot.day].push({
                        course,
                        color,
                        isPreview,
                        style: { top, height }
                    });
                }
            });
        });
        return temp;
    }, [selectedCourses, previewCourse]);

    // --- ACTIONS ---

    const copyRoutine = () => {
        // Group by type
        const classes = selectedCourses.filter(c => c.section !== 'Custom');
        const customEvents = selectedCourses.filter(c => c.section === 'Custom');

        // Group custom events by tag
        const customByTag: Record<string, CourseRow[]> = {};
        customEvents.forEach(c => {
            const tag = c.courseCode; // We stored tag in courseCode
            if (!customByTag[tag]) customByTag[tag] = [];
            customByTag[tag].push(c);
        });

        let text = "My Schedule\n\n";

        if (classes.length > 0) {
            text += "[Classes]\n";
            classes.forEach(c => {
                text += `${c.courseCode} - Sec ${c.section} (${c.time})\n`;
            });
            text += "\n";
        }

        Object.entries(customByTag).forEach(([tag, events]) => {
            text += `[${tag}]\n`;
            events.forEach(e => {
                text += `${e.time}\n`;
            });
            text += "\n";
        });

        // Add verification code for import
        const data = btoa(JSON.stringify(selectedCourses));
        text += `\n||DATA:${data}||`;

        navigator.clipboard.writeText(text);
        setNotification({ message: "Routine copied to clipboard!", type: "success" });
    };

    const copyImageToClipboard = async () => {
        if (!scheduleRef.current) return;
        try {
            const blob = await toBlob(scheduleRef.current, { cacheBust: true, backgroundColor: '#0f172a' });
            if (!blob) throw new Error('Blob generation failed');
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setNotification({ message: "Image copied to clipboard!", type: "success" });
        } catch (e) {
            console.error(e);
            setNotification({ message: "Failed to copy image.", type: "error" });
        }
    };

    const handleImport = () => {
        try {
            const match = importText.match(/\|\|DATA:(.*)\|\|/);
            if (match && match[1]) {
                const json = atob(match[1]);
                const parsed = JSON.parse(json);
                setSelectedCourses(parsed);
                setNotification({ message: "Schedule imported successfully!", type: "success" });
                setShowImportModal(false);
                setImportText('');
            } else {
                setNotification({ message: "Invalid format. Cannot find data block.", type: "error" });
            }
        } catch (e) {
            setNotification({ message: "Failed to parse import data.", type: "error" });
        }
    };

    const downloadImage = async () => {
        if (!scheduleRef.current) return;
        try {
            const dataUrl = await toPng(scheduleRef.current, { cacheBust: true, backgroundColor: '#0f172a' });
            const link = document.createElement('a');
            link.download = 'my-schedule.png';
            link.href = dataUrl;
            link.click();
            setNotification({ message: "Schedule downloaded!", type: "success" });
        } catch (e) {
            console.error(e);
            setNotification({ message: "Failed to download image.", type: "error" });
        }
    };

    const handleAddCustomEvent = () => {
        if (!customTag) {
            setNotification({ message: "Please enter a tag name", type: "error" });
            return;
        }
        if (customDays.length === 0) {
            setNotification({ message: "Select at least one day", type: "error" });
            return;
        }

        // Format Time to 12h for parser
        const formatTime = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const dayMap: Record<string, string> = { 'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'R', 'Fri': 'F', 'Sat': 'A', 'Sun': 'S' };
        const dayString = customDays.map(d => dayMap[d]).join('');
        const timeString = `${dayString} ${formatTime(customStartTime)} - ${formatTime(customEndTime)}`;

        const newEvent: CourseRow = {
            id: `custom-${Date.now()}`,
            courseCode: customTag,
            section: 'Custom',
            facultyCode: 'Me',
            time: timeString,
            room: 'N/A',
            seat: 0,
            credit: 0,
            days: dayString,
        };

        const success = handleCourseSelect(newEvent);

        if (success) {
            setCustomTag('');
            setCustomDays([]);
            setNotification({ message: "Custom event added!", type: "success" });
        }
    };

    const toggleDay = (day: string) => {
        setCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0f172a] border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-down">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Import Schedule</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white"><FaTimes /></button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Paste the text copied from another schedule to import it here. This will replace your current schedule.</p>
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="Paste schedule text here..."
                            className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 mb-4 resize-none"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300">Cancel</button>
                            <button onClick={handleImport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                <FaFileImport /> Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left: Sidebar (Swapped Position) */}
            <div className="w-full lg:w-72 glass rounded-xl p-3 flex flex-col shrink-0 lg:h-full h-auto max-h-[500px] lg:max-h-full transition-all">
                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-black/20 rounded-lg mb-3">
                    <button
                        onClick={() => setSidebarTab('courses')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'courses' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Courses
                    </button>
                    <button
                        onClick={() => setSidebarTab('custom')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Custom
                    </button>
                </div>

                {sidebarTab === 'courses' ? (
                    <>
                        <div className="mb-3 relative">
                            <input
                                type="text"
                                placeholder="Search courses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-gray-500"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {/* Render Filtered All Courses */}
                            {allCourses
                                .filter(c =>
                                (c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    c.section.toString().includes(searchTerm))
                                )
                                .slice(0, 50) // Limit for performance
                                .map(course => {
                                    const isSelected = selectedCourses.some(c => c.id === course.id);
                                    return (
                                        <button
                                            key={course.id}
                                            onClick={() => handleCourseSelect(course)}
                                            className={`w-full text-left p-2 rounded-lg border transition-all duration-200 group relative ${isSelected
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
                                        </button>
                                    );
                                })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Tag Name</label>
                            <input
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                placeholder="e.g. Work, Gym"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['Work', 'Gym', 'Study', 'Class'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setCustomTag(tag)}
                                        className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                                    >
                                        {tag}+
                                    </button>
                                ))}
                            </div>
                            {customTag.toLowerCase() === 'work' && (
                                <p className="text-[10px] text-yellow-500 flex items-center gap-1 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                                    Will appear yellow
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Days</label>
                            <div className="grid grid-cols-4 gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDay(day)}
                                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all border border-transparent ${customDays.includes(day)
                                            ? 'bg-indigo-600 text-white shadow-lg border-indigo-400'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Time</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="time"
                                    value={customStartTime}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-white focus:outline-none cursor-pointer flex-1 text-center hover:bg-white/5 transition-colors"
                                />
                                <span className="text-gray-500 text-xs font-medium">to</span>
                                <input
                                    type="time"
                                    value={customEndTime}
                                    onClick={(e) => e.currentTarget.showPicker()}
                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                    className="bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-white focus:outline-none cursor-pointer flex-1 text-center hover:bg-white/5 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddCustomEvent}
                            className="mt-auto w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <FaCheck /> Add Custom Event
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Schedule Grid */}
            <div className="flex-1 glass rounded-xl p-3 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-xl font-bold text-white">Weekly Schedule</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Import Schedule">
                            <FaFileImport />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 my-auto mx-1"></div>
                        <button onClick={copyRoutine} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Copy Text">
                            <FaCopy />
                        </button>
                        <button onClick={copyImageToClipboard} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Copy Image to Clipboard">
                            <FaClipboard />
                        </button>
                        <button onClick={downloadImage} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors text-white" title="Download PNG">
                            <FaDownload />
                        </button>
                    </div>
                </div>

                {/* The Grid Container - Capture Target */}
                <div ref={scheduleRef} className="p-2 bg-[#0f172a] rounded-lg border border-white/5 w-full h-full flex flex-col">
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
                                            className={`absolute inset-x-0 mx-0.5 rounded shadow-lg p-1 text-xs text-white border border-white/10 flex flex-col justify-center items-center transition-all cursor-default group overflow-hidden ${item.color} ${item.isPreview
                                                ? 'opacity-50 border-dashed border-white/40 pointer-events-none'
                                                : 'hover:scale-[1.02] hover:z-20'
                                                }`}
                                            style={{
                                                top: item.style.top,
                                                height: item.style.height,
                                                minHeight: '20px' // Ensure visibility for short blocks
                                            }}
                                        >
                                            {!item.isPreview && (
                                                <div
                                                    className="absolute top-0.5 right-0.5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white/70 hover:text-white bg-black/20 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCourseSelect(item.course);
                                                    }}
                                                    title="Remove from schedule"
                                                >
                                                    <FaTimes size={8} />
                                                </div>
                                            )}
                                            <div className="font-bold leading-tight text-center truncate w-full">{item.course.courseCode}</div>
                                            {item.course.section === 'Custom' ? (
                                                <div className="text-[9px] opacity-80 text-center truncate w-full mt-0.5">
                                                    {(() => {
                                                        const diff = (item.style.height.replace('%', '') as any) * TOTAL_MINS / 100;
                                                        const h = Math.floor(diff / 60);
                                                        const m = Math.round(diff % 60);
                                                        return `${h > 0 ? h + ' hr ' : ''}${m > 0 ? m + ' min' : ''}`;
                                                    })()}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-[11px] font-extrabold text-center truncate w-full opacity-90">{item.course.facultyCode}</div>
                                                    <div className="text-[9px] opacity-80 text-center truncate w-full">Sec {item.course.section}</div>
                                                    <div className="hidden sm:block text-[8px] opacity-60 text-center uppercase tracking-wide group-hover:opacity-100 transition-opacity truncate w-full">{item.course.room}</div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Logo for Screenshot */}
                    <div className="text-right mt-1 text-gray-600 text-[9px] font-mono opacity-50 shrink-0">
                        Generated by course-koi.vercel.app
                    </div>
                </div>
            </div>


        </div>
    );
}
