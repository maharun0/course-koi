'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { CourseRow } from '@/types/course';
import { parseCourseTime } from '@/utils/timeUtils';
import { FaCopy, FaDownload, FaCheck, FaTimes, FaClipboard, FaFileImport, FaFileExport, FaPaste, FaCloudUploadAlt, FaFileCode } from 'react-icons/fa';
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

const START_OF_DAY = 8 * 60; // 08:00 AM
const END_OF_DAY = 19 * 60 + 30; // 07:30 PM (End of last slot)
const TOTAL_MINS = END_OF_DAY - START_OF_DAY;

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
    const [exportExpanded, setExportExpanded] = useState(false);
    const [importText, setImportText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- DRAG & DROP STATE ---
    interface DragState {
        isDragging: boolean;
        mode: 'move' | 'resize' | 'resize-top' | null;
        courseId: string | null;
        originalCourse: CourseRow | null;
        startY: number;
        startTop: number;   // %
        startHeight: number; // %
        currentTop: number; // %
        currentHeight: number; // %
        originalDay: string;
        currentDay: string;
        startMins: number;
        endMins: number;
    }

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        mode: null,
        courseId: null,
        originalCourse: null,
        startY: 0,
        startTop: 0,
        startHeight: 0,
        currentTop: 0,
        currentHeight: 0,
        originalDay: '',
        currentDay: '',
        startMins: 0,
        endMins: 0,
    });

    // --- HOVER GAP DETECTION ---
    const [hoverState, setHoverState] = useState<{ day: string; mins: number } | null>(null);

    // Helpers
    const minutesToTimeStr = (totalMins: number): string => {
        // Clamp
        totalMins = Math.max(START_OF_DAY, Math.min(END_OF_DAY, totalMins));

        const h = Math.floor(totalMins / 60);
        const m = Math.round(totalMins % 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    const finishDrag = () => {
        if (!dragState.originalCourse || !dragState.courseId) {
            setDragState(prev => ({ ...prev, isDragging: false }));
            return;
        }

        const startMins = START_OF_DAY + (dragState.currentTop / 100) * TOTAL_MINS;
        const endMins = startMins + (dragState.currentHeight / 100) * TOTAL_MINS;

        let s = Math.round(startMins / 5) * 5;
        let e = Math.round(endMins / 5) * 5;

        if (s < START_OF_DAY) { const diff = e - s; s = START_OF_DAY; e = s + diff; }
        if (e > END_OF_DAY) { const diff = e - s; e = END_OF_DAY; s = e - diff; }
        if (s < START_OF_DAY) s = START_OF_DAY;

        const timeStr = `${minutesToTimeStr(s)} - ${minutesToTimeStr(e)}`;

        const dayLetterMap: Record<string, string> = { 'Mon': 'M', 'Tue': 'T', 'Wed': 'W', 'Thu': 'R', 'Fri': 'F', 'Sat': 'A', 'Sun': 'S' };
        const newDayLetter = dayLetterMap[dragState.currentDay] || 'M';

        const original = dragState.originalCourse;
        const origDayBlock = dayLetterMap[dragState.originalDay];

        const remainingDays = original.days.replace(origDayBlock, '');

        let newCourses = [...selectedCourses];

        if (remainingDays.length === 0) {
            newCourses = newCourses.filter(c => c.id !== original.id);
        } else {
            const idx = newCourses.findIndex(c => c.id === original.id);
            if (idx !== -1) {
                newCourses[idx] = { ...original, days: remainingDays };
            }
        }

        const newId = remainingDays.length > 0 ? `custom-${original.courseCode}-${Date.now()}` : original.id;

        const newEntry: CourseRow = {
            ...original,
            id: newId,
            days: newDayLetter,
            time: `${newDayLetter} ${timeStr}`,
            color: original.color
        };

        newCourses.push(newEntry);
        setSelectedCourses(newCourses);

        setDragState(prev => ({ ...prev, isDragging: false, courseId: null }));
    };

    // Global Mouse Handlers for Drag
    useEffect(() => {
        if (!dragState.isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!scheduleRef.current) return;
            const dy = e.clientY - dragState.startY;
            // Approximate content height based on Viewport/Start
            // Better: use relative % change if we knew px height.
            // Let's assume height is fixed or calculate from ref?
            // The ref is the container.
            // The day columns are 100% height.
            const gridRect = scheduleRef.current.getBoundingClientRect();
            const contentHeight = gridRect.height - 32; // Header

            const dPct = (dy / contentHeight) * 100;
            const dMins = (dPct / 100) * TOTAL_MINS;

            setDragState(prev => {
                let newStart = prev.startMins;
                let newEnd = prev.endMins;

                if (prev.mode === 'move') {
                    const snap = 5;
                    const rawNewStart = prev.startMins + dMins;
                    const snappedStart = Math.round(rawNewStart / snap) * snap;
                    const diff = snappedStart - prev.startMins;
                    newStart = prev.startMins + diff;
                    newEnd = prev.endMins + diff;
                } else if (prev.mode === 'resize') {
                    const snap = 5;
                    const rawNewEnd = prev.endMins + dMins;
                    newEnd = Math.round(rawNewEnd / snap) * snap;
                    if (newEnd - newStart < 15) newEnd = newStart + 15;
                } else if (prev.mode === 'resize-top') {
                    const snap = 5;
                    const rawNewStart = prev.startMins + dMins;
                    newStart = Math.round(rawNewStart / snap) * snap;
                    if (newEnd - newStart < 15) newStart = newEnd - 15;
                }

                const newTop = ((newStart - START_OF_DAY) / TOTAL_MINS) * 100;
                const newHeight = ((newEnd - newStart) / TOTAL_MINS) * 100;

                return {
                    ...prev,
                    currentTop: newTop,
                    currentHeight: newHeight,
                };
            });
        };

        const handleMouseUp = () => {
            finishDrag();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState.isDragging]); // Relying on closure for finishDrag

    const handleDragStart = (e: React.MouseEvent, course: CourseRow, day: string, slot: { start: number, end: number }, top: string, height: string, type: 'move' | 'resize' | 'resize-top') => {
        e.stopPropagation();
        e.preventDefault();

        const t = parseFloat(top);
        const h = parseFloat(height);

        setDragState({
            isDragging: true,
            mode: type,
            courseId: course.id,
            originalCourse: course,
            startY: e.clientY,
            startTop: t,
            startHeight: h,
            currentTop: t,
            currentHeight: h,
            originalDay: day,
            currentDay: day,
            startMins: slot.start,
            endMins: slot.end,
        });
    };

    // Grid Hover Handlers
    const handleGridMouseMove = (e: React.MouseEvent, day: string) => {
        if (dragState.isDragging) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const h = rect.height;
        const pct = (y / h);
        const mins = START_OF_DAY + pct * TOTAL_MINS;

        setHoverState({ day, mins });
    };

    const handleGridMouseLeave = () => {
        setHoverState(null);
    };

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

    // Color Migration & Cleanup Effect
    // Ensures all courses have a color assigned, and cleans data structure if needed
    useEffect(() => {
        if (!isLoaded) return;

        let hasChanges = false;
        const colors = [
            'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
            'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'
        ];

        const updated = selectedCourses.map((c, idx) => {
            if (!c.color) {
                hasChanges = true;
                let newColor = colors[idx % colors.length];
                if (c.courseCode.toLowerCase() === 'work') newColor = 'bg-yellow-500 text-black';
                else if (c.section === 'Custom' && c.courseCode.toLowerCase() !== 'work') newColor = 'bg-gray-600';
                return { ...c, color: newColor };
            }
            return c;
        });

        if (hasChanges) {
            setSelectedCourses(updated);
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

        const newSchedule = parseCourseTime(course.time, course.id, course.courseCode, course.section || '');

        if (!newSchedule) {
            setNotification({ message: "Invalid time format.", type: "error" });
            return false;
        }

        let hasConflict = false;
        let conflictReason = "";

        for (const existing of coursesToCheck) {
            const existingSchedule = parseCourseTime(existing.time, existing.id, existing.courseCode, existing.section || '');
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
            // Preserve existing color if updating
            const existingColor = newSelection[sameCourseIndex].color;
            newSelection[sameCourseIndex] = { ...course, color: existingColor || course.color };
            setSelectedCourses(newSelection);
        } else {
            // Assign a permanent color
            const colors = [
                'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
                'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'
            ];
            let newColor = colors[selectedCourses.length % colors.length];

            // Overrides
            if (course.courseCode.toLowerCase() === 'work') {
                newColor = 'bg-yellow-500 text-black';
            } else if (course.section === 'Custom' && course.courseCode.toLowerCase() !== 'work') {
                newColor = 'bg-gray-600';
            }

            setSelectedCourses([...selectedCourses, { ...course, color: newColor }]);
        }
        return true;
    };

    // --- POSITIONING LOGIC ---
    // Constants moved to module scope

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
            const schedule = parseCourseTime(course.time, course.id, course.courseCode, course.section || '');
            if (!schedule) return;

            // Determine Color
            // Use stored color if available, else fallback (though now we always store)
            let color = course.color;

            if (!color) {
                // Fallback for logic
                color = colors[idx % colors.length];
                if (course.courseCode.toLowerCase() === 'work') {
                    color = 'bg-yellow-500 text-black';
                } else if (course.section === 'Custom') {
                    color = 'bg-gray-600';
                }
            }

            // Preview override
            if (isPreview) color = 'bg-gray-500';

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

        // GAP DETECTION RENDER
        if (hoverState && !dragState.isDragging) {
            const { day, mins } = hoverState;
            const items = temp[day];
            if (items && items.length > 0) {
                // Sort items by start time (top %)
                const sorted = [...items].sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top));

                // Find the gap surrounding 'mins'
                for (let i = 0; i < sorted.length - 1; i++) {
                    const current = sorted[i];
                    const next = sorted[i + 1];

                    // Get end of current
                    const curTop = parseFloat(current.style.top);
                    const curH = parseFloat(current.style.height);
                    const curEndMins = START_OF_DAY + (curTop + curH) / 100 * TOTAL_MINS;

                    // Get start of next
                    const nextStartMins = START_OF_DAY + (parseFloat(next.style.top) / 100 * TOTAL_MINS);

                    // Check if mouse is between them
                    if (mins >= curEndMins && mins <= nextStartMins) {
                        // We are in a gap!
                        const diff = nextStartMins - curEndMins;
                        if (diff > 10) { // Min gap size to show
                            const gapH = (diff / TOTAL_MINS) * 100;
                            const gapTop = ((curEndMins - START_OF_DAY) / TOTAL_MINS) * 100;

                            const h = Math.floor(diff / 60);
                            const m = Math.round(diff % 60);
                            const label = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm' : ''}`;

                            temp[day].push({
                                course: { id: 'gap', courseCode: 'Gap', time: '', days: '', section: '', color: '' } as any,
                                color: 'border-2 border-dashed border-gray-500/50 bg-gray-500/10 text-gray-400',
                                isPreview: true, // reuse preview style flag logic partly
                                isGap: true,
                                label,
                                style: {
                                    top: `${gapTop}%`,
                                    height: `${gapH}%`,
                                    zIndex: 5
                                }
                            } as any);
                        }
                        break; // Found the gap
                    }
                }
            }
        }

        return temp;
    }, [selectedCourses, previewCourse, hoverState, dragState.isDragging]);




    // --- STATS LOGIC ---
    const tagStats = useMemo(() => {
        const stats: Record<string, number> = {};

        // 1. Existing Courses
        selectedCourses.forEach(c => {
            if (c.section !== 'Custom') return;
            const sched = parseCourseTime(c.time, c.id, c.courseCode, c.section);
            if (!sched) return;

            // Calculate duration in minutes (per occurrence * number of occurrences is handled by slots)
            let mins = 0;
            sched.slots.forEach(slot => {
                mins += (slot.end - slot.start);
            });

            const tag = c.courseCode; // We store Name/Tag in courseCode
            stats[tag] = (stats[tag] || 0) + mins;
        });

        // 2. Unsaved Preview
        let unsavedMins = 0;
        let unsavedTag = '';
        if (sidebarTab === 'custom' && customTag && customDays.length > 0) {
            // Parse start/end
            const [sh, sm] = customStartTime.split(':').map(Number);
            const [eh, em] = customEndTime.split(':').map(Number);
            const startMins = sh * 60 + sm;
            const endMins = eh * 60 + em;

            if (endMins > startMins) {
                unsavedMins = (endMins - startMins) * customDays.length;
                unsavedTag = customTag;
            }
        }

        return { stats, unsavedMins, unsavedTag };
    }, [selectedCourses, customTag, customDays, customStartTime, customEndTime, sidebarTab]);

    // --- ACTIONS ---

    const copyRoutineText = () => {
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

        // NO DATA BLOCK HERE

        navigator.clipboard.writeText(text);
        setNotification({ message: "Schedule text copied!", type: "success" });
    };

    const copyExportData = () => {
        // Uniform Export: Copy exactly what goes into the file
        const data = JSON.stringify(selectedCourses, null, 2);
        navigator.clipboard.writeText(data);
        setNotification({ message: "Schedule JSON copied!", type: "success" });
        setExportExpanded(false);
    };

    const downloadExportFile = () => {
        const data = JSON.stringify(selectedCourses, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'course-koi-schedule.json';
        link.click();
        URL.revokeObjectURL(url);
        setNotification({ message: "Schedule exported as JSON!", type: "success" });
        setExportExpanded(false);
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

    const handleImportText = () => {
        try {
            // Try to find the data block first
            const match = importText.match(/\|\|DATA:(.*)\|\|/);
            let jsonString = "";

            if (match && match[1]) {
                jsonString = atob(match[1]);
            } else {
                // Try parsing raw if user pasted raw JSON
                jsonString = importText;
            }

            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                setSelectedCourses(parsed);
                setNotification({ message: "Schedule imported successfully!", type: "success" });
                setShowImportModal(false);
                setImportText('');
            } else {
                throw new Error("Invalid Array");
            }
        } catch (e) {
            setNotification({ message: "Invalid format. Cannot parse schedule data.", type: "error" });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const parsed = JSON.parse(result);
                if (Array.isArray(parsed)) {
                    setSelectedCourses(parsed);
                    setNotification({ message: "File imported successfully!", type: "success" });
                    setShowImportModal(false);
                } else {
                    setNotification({ message: "Invalid file format.", type: "error" });
                }
            } catch (err) {
                setNotification({ message: "Failed to read file.", type: "error" });
            }
        };
        reader.readAsText(file);
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

        // If editing, use existing ID, else create new
        const idToUse = editingId || `custom-${customTag}-${Date.now()}`;

        const newEvent: CourseRow = {
            id: idToUse,
            courseCode: customTag,
            section: 'Custom', // Keep section 'Custom' for internal logic identification
            days: dayString,
            time: timeString,
            color: customTag.toLowerCase() === 'work' ? 'bg-yellow-500 text-black' : 'bg-gray-600'
        };

        if (editingId) {
            // Update logic: Replace the object with specific ID
            // If we use handleCourseSelect it toggles. We want to force Replace.
            // Manually update:
            setSelectedCourses(prev => prev.map(c => c.id === editingId ? newEvent : c));
            setNotification({ message: "Event updated!", type: "success" });
            setEditingId(null);
            setCustomTag('');
            setCustomDays([]);
        } else {
            // Add new logic
            const success = handleCourseSelect(newEvent);
            if (success) {
                setCustomTag('');
                setCustomDays([]);
                setNotification({ message: "Custom event added!", type: "success" });
            }
        }
    };

    const handleEditEvent = (course: CourseRow) => {
        setEditingId(course.id);
        setCustomTag(course.courseCode);

        // Parse Days
        // Course days string is like 'MWF'
        // Map back to 'Mon', 'Wed' etc.
        const charToDay: Record<string, string> = { 'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 'R': 'Thu', 'F': 'Fri', 'A': 'Sat', 'S': 'Sun' };
        const days: string[] = [];
        for (const char of course.days) {
            if (charToDay[char]) days.push(charToDay[char]);
        }
        setCustomDays(days);

        // Parse Time
        // Format: "MWF 08:00 AM - 09:00 AM" or just "08:00 AM - 09:00 AM" part
        // We need to extract hours/mins and convert to 24h for input
        // Regex look for digits
        const timePart = course.time.replace(/^[A-Z]+\s/, ''); // Remove day prefix if present
        const [startStr, endStr] = timePart.split('-').map(s => s.trim());

        const to24 = (time12: string) => {
            const [time, modifier] = time12.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };

        if (startStr && endStr) {
            setCustomStartTime(to24(startStr));
            setCustomEndTime(to24(endStr));
        }

        setSidebarTab('custom');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setCustomTag('');
        setCustomDays([]);
        setCustomStartTime('08:00');
        setCustomEndTime('10:00');
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
                <div
                    className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
                    onClick={() => setShowImportModal(false)}
                >
                    <div
                        className="bg-[#0f172a]/90 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaFileImport className="text-indigo-400" /> Import Schedule
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white transition-colors"><FaTimes /></button>
                        </div>

                        <div className="space-y-4">
                            {/* File Upload Option */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-white/5 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <div className="p-3 bg-white/5 rounded-full mb-3 group-hover:bg-indigo-500/20 transition-colors">
                                    <FaCloudUploadAlt className="text-2xl text-gray-400 group-hover:text-indigo-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-300">Click to upload JSON file</p>
                                <p className="text-xs text-gray-500">or drag and drop</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".json"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-[#0f172a] text-gray-500 uppercase tracking-wider">Or paste code</span>
                                </div>
                            </div>

                            <textarea
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder="Paste the export code starting with ||DATA:..."
                                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-300 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600 transition-colors"
                            />

                            <button
                                onClick={handleImportText}
                                disabled={!importText}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <FaCheck /> Import Data
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Left: Sidebar (Swapped Position -> Right) */}
            <div className="w-full lg:w-72 glass rounded-xl p-3 flex flex-col shrink-0 lg:h-full h-auto max-h-[500px] lg:max-h-full transition-all lg:order-2">
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
                                    c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (c.section && c.section.toString().includes(searchTerm))
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
                                {['Work', 'Gym', 'Study', 'Class', 'Bootcamp', 'Contest'].map(tag => (
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

                        {/* Tag Stats */}
                        <div className="space-y-1 pt-2 border-t border-white/5">
                            {Object.entries(tagStats.stats).map(([tag, mins]) => {
                                // Check if we have unsaved time for this tag
                                const isEditTag = tagStats.unsavedTag === tag && tagStats.unsavedMins > 0;

                                const formatDuration = (m: number) => {
                                    const hours = Math.floor(m / 60);
                                    const minutes = m % 60;
                                    return `${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + 'm' : ''}`;
                                };

                                return (
                                    <div key={tag} className="flex justify-between items-center text-[11px] text-gray-400">
                                        <span>{tag}</span>
                                        <div className="flex gap-1">
                                            <span>{formatDuration(mins)}</span>
                                            {isEditTag && (
                                                <span className="opacity-50 text-indigo-300">
                                                    (+{formatDuration(tagStats.unsavedMins)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* If current tag is NEW (not in stats yet) show it purely as unsaved */}
                            {tagStats.unsavedTag && !tagStats.stats[tagStats.unsavedTag] && tagStats.unsavedMins > 0 && (
                                <div className="flex justify-between items-center text-[11px] text-gray-400">
                                    <span>{tagStats.unsavedTag}</span>
                                    <span className="opacity-50 text-indigo-300">
                                        (+{(() => {
                                            const m = tagStats.unsavedMins;
                                            const hours = Math.floor(m / 60);
                                            const minutes = m % 60;
                                            return `${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + 'm' : ''}`;
                                        })()})
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 mt-auto">
                            {editingId && (
                                <button
                                    onClick={cancelEdit}
                                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold text-sm transition-all"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={handleAddCustomEvent}
                                className={`flex-1 py-2 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                            >
                                {editingId ? 'Update Event' : 'Add Event+'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Schedule Grid */}
            <div className="flex-1 glass rounded-xl p-3 overflow-hidden flex flex-col lg:order-1">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-xl font-bold text-white">Weekly Schedule</h2>
                    <div className="flex gap-2">
                        <div className="relative z-50">
                            <button
                                onClick={() => setExportExpanded(!exportExpanded)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors text-white ${exportExpanded ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-white/10 hover:bg-white/20'}`}
                                title="Export Schedule"
                            >
                                <FaFileExport /> <span className="hidden sm:inline">Export</span>
                            </button>
                            {exportExpanded && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 animate-fade-in origin-top-left overflow-hidden">
                                    <button
                                        onClick={copyExportData}
                                        className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-3"
                                    >
                                        <FaClipboard className="text-indigo-400" /> Copy JSON
                                    </button>
                                    <button
                                        onClick={downloadExportFile}
                                        className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-3"
                                    >
                                        <FaFileCode className="text-purple-400" /> Download JSON
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="h-4 w-[1px] bg-white/10 my-auto mx-1"></div>
                        <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Import Schedule">
                            <FaFileImport /> <span className="hidden sm:inline">Import</span>
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 my-auto mx-1"></div>
                        <button onClick={copyRoutineText} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Copy Text Only">
                            <FaCopy /> <span className="hidden sm:inline">Text</span>
                        </button>
                        <button onClick={copyImageToClipboard} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors text-white" title="Copy Image">
                            <FaClipboard /> <span className="hidden sm:inline">Image</span>
                        </button>
                        <button onClick={downloadImage} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors text-white" title="Download PNG">
                            <FaDownload /> <span className="hidden sm:inline">PNG</span>
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
                                <div
                                    className="absolute top-8 bottom-0 w-full"
                                    onMouseMove={(e) => handleGridMouseMove(e, day)}
                                    onMouseLeave={handleGridMouseLeave}
                                >
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
                                                : (item as any).isGap ? 'z-0' : 'hover:scale-[1.02] hover:z-20'
                                                }`}
                                            style={{
                                                top: item.style.top,
                                                height: item.style.height,
                                                minHeight: '20px' // Ensure visibility for short blocks
                                            }}
                                        >
                                            {(item as any).isGap ? (
                                                <div className="flex flex-col items-center justify-center text-[10px] font-mono tracking-wider opacity-70 leading-tight">
                                                    <span className="font-bold uppercase text-[9px] mb-0.5">Gap</span>
                                                    <span>{(item as any).label}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {!item.isPreview && (
                                                        <div
                                                            className="absolute top-0.5 right-0.5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-30"
                                                        >
                                                            {/* Edit Button */}
                                                            {item.course.section === 'Custom' && (
                                                                <div
                                                                    className="p-0.5 cursor-pointer text-white/70 hover:text-white bg-black/20 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditEvent(item.course);
                                                                    }}
                                                                    title="Edit Event"
                                                                >
                                                                    {/* Simple Pen Icon manually since we might replace icons */}
                                                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="8" width="8" xmlns="http://www.w3.org/2000/svg"><path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-12.3 4.7-17 0l-111-111c-4.7-4.7-4.7-12.3 0-17l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l60.1 60.1c18.8 18.7 18.8 49.1 0 67.9zM284.2 99.8L21.6 362.4.4 483.9c-2.9 16.4 11.4 30.6 27.8 27.8l121.5-21.3 262.6-262.6c4.7-4.7 4.7-12.3 0-17l-111-111c-4.8-4.7-12.4-4.7-17.1 0zM124.1 339.9c-5.5-5.5-5.5-14.3 0-19.8l154-154c5.5-5.5 14.3-5.5 19.8 0s5.5 14.3 0 19.8l-154 154c-5.5 5.5-14.3 5.5-19.8 0zM88 424h48v36.3l-64.5 11.3-31.1-31.1L51.7 376H88v48z"></path></svg>
                                                                </div>
                                                            )}
                                                            {/* Delete Button */}
                                                            <div
                                                                className="p-0.5 cursor-pointer text-white/70 hover:text-white bg-black/20 rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCourseSelect(item.course);
                                                                }}
                                                                title="Remove from schedule"
                                                            >
                                                                <FaTimes size={8} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="font-bold leading-tight text-center truncate w-full">{item.course.courseCode}</div>
                                                    {item.course.section === 'Custom' ? (
                                                        <div className="flex flex-col items-center w-full">
                                                            <div className="text-[10px] opacity-80 text-center truncate w-full mt-0.5">
                                                                {(() => {
                                                                    const diff = (item.style.height.replace('%', '') as any) * TOTAL_MINS / 100;
                                                                    const h = Math.floor(diff / 60);
                                                                    const m = Math.round(diff % 60);
                                                                    return `${h > 0 ? h + ' hr ' : ''}${m > 0 ? m + ' min' : ''}`;
                                                                })()}
                                                            </div>
                                                            <div className="text-[11.5px] font-semibold opacity-90 text-center truncate w-full mt-2.5">
                                                                {(() => {
                                                                    const top = parseFloat(item.style.top);
                                                                    const height = parseFloat(item.style.height);
                                                                    const s = START_OF_DAY + (top / 100) * TOTAL_MINS;
                                                                    const e = s + (height / 100) * TOTAL_MINS;
                                                                    return `${minutesToTimeStr(s)} - ${minutesToTimeStr(e)}`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-[11px] font-extrabold text-center truncate w-full opacity-90">{item.course.facultyCode}</div>
                                                            <div className="text-[9px] opacity-80 text-center truncate w-full">Sec {item.course.section}</div>
                                                            <div className="hidden sm:block text-[8px] opacity-60 text-center uppercase tracking-wide group-hover:opacity-100 transition-opacity truncate w-full">{item.course.room}</div>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Logo for Screenshot */}
                    <div className="text-right mt-2 text-gray-400 text-xs font-mono font-semibold opacity-90 shrink-0">
                        Generated by course-koi.vercel.app
                    </div>
                </div>
            </div>


        </div>
    );
}
