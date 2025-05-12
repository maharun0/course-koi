'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { FaStar } from 'react-icons/fa';

// Updated CourseRow interface to match new CSV format
interface CourseRow {
	id: string; // Generated from Course Code + Section
	courseCode: string;
	credit: number;
	section: string;
	facultyCode: string;
	days: string;
	time: string; // Combination of Days and Time
	room: string;
	seat: number;
	priority?: number; // Optional priority value for sorting
	starred?: boolean; // Whether the course is starred
}

type SortKey = keyof CourseRow | 'index';
type SortDirection = 'none' | 'asc' | 'desc';

// Define a type for a single sort configuration
interface SortConfig {
	key: SortKey;
	dir: SortDirection;
}

export default function CourseFilterPage() {
	const [rows, setRows] = useState<CourseRow[]>([]);
	const [query, setQuery] = useState('');
	const [starredQuery, setStarredQuery] = useState('');
	const [sorts, setSorts] = useState<SortConfig[]>([]);
	const [savedCourses, setSavedCourses] = useState<CourseRow[]>([]);
	const [starredCourses, setStarredCourses] = useState<CourseRow[]>([]);
	const [inputCourse, setInputCourse] = useState('');
	const [showDialog, setShowDialog] = useState<'added' | 'error' | 'cleared' | null>(null);
	const [activeCourse, setActiveCourse] = useState<string | null>(null);
	const [dragging, setDragging] = useState<string | null>(null);
	const [showClearPriorityConfirm, setShowClearPriorityConfirm] = useState(false);
	const [view, setView] = useState<'all' | 'starred'>('all');
	const [coursePriorities, setCoursePriorities] = useState<Record<string, number>>({});
	const [selectedStarredCourses, setSelectedStarredCourses] = useState<string[]>([]);
	const [selectedAllCourses, setSelectedAllCourses] = useState<string[]>([]);
	const [showFilterMenu, setShowFilterMenu] = useState(false);
	const [filterColumns, setFilterColumns] = useState<string[]>(['courseCode', 'facultyCode', 'room']);
	const filterMenuRef = useRef<HTMLDivElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);

	// Fetch and parse new CSV format
	useEffect(() => {
		fetch('/courses_pdf.csv')
			.then((r) => r.text())
			.then((txt) => {
				const parsed: CourseRow[] = txt
					.trim()
					.split(/\r?\n/)
					.slice(1) // Skip header row
					.filter(Boolean)
					.map((ln) => ln.split(',').map((c) => c.trim()))
					.map((c) => ({
						id: `${c[0]}-${c[2]}`, // Generate id from Course Code + Section
						courseCode: c[0],
						credit: Number(c[1]),
						section: c[2],
						facultyCode: c[3],
						days: c[4],
						time: `${c[4]} ${c[5]}`, // Combine Days and Time
						room: c[6],
						seat: Number(c[7]),
					}));
				setRows(parsed);
			});
	}, []);

	// Load saved and starred courses from localStorage
	useEffect(() => {
		const storedSaved = JSON.parse(localStorage.getItem('savedCourses') ?? '[]');
		setSavedCourses(Array.isArray(storedSaved) ? storedSaved : []);
		const storedStarred = JSON.parse(localStorage.getItem('starredCourses') ?? '[]');
		setStarredCourses(Array.isArray(storedStarred) ? storedStarred : []);
		const storedPriorities = JSON.parse(localStorage.getItem('coursePriorities') ?? '{}');
		setCoursePriorities(typeof storedPriorities === 'object' ? storedPriorities : {});
	}, []);

	// Save saved courses to localStorage
	useEffect(() => {
		localStorage.setItem('savedCourses', JSON.stringify(savedCourses));
	}, [savedCourses]);

	// Save starred courses to localStorage
	useEffect(() => {
		localStorage.setItem('starredCourses', JSON.stringify(starredCourses));
	}, [starredCourses]);

	// Save course priorities to localStorage
	useEffect(() => {
		localStorage.setItem('coursePriorities', JSON.stringify(coursePriorities));
	}, [coursePriorities]);

	// Handle clicks outside the filter menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				showFilterMenu &&
				filterMenuRef.current &&
				!filterMenuRef.current.contains(event.target as Node) &&
				filterButtonRef.current &&
				!filterButtonRef.current.contains(event.target as Node)
			) {
				if (filterColumns.length === 0) {
					setFilterColumns(['courseCode', 'facultyCode', 'room']);
				}
				setShowFilterMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showFilterMenu, filterColumns]);

	// Derived data
	const courseOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.courseCode))).sort(), [rows]);

	const filtered = useMemo(() => {
		let base = rows.map((row) => ({
			...row,
			priority: coursePriorities[row.id] ?? undefined,
			starred: starredCourses.some((c) => c.id === row.id),
		}));

		// First filter by active course if set (from sidebar)
		if (activeCourse) base = base.filter((r) => r.courseCode === activeCourse);

		// Then filter by selected course codes if any (from course filter buttons)
		if (selectedAllCourses.length > 0) {
			base = base.filter((r) => selectedAllCourses.includes(r.courseCode));
		}

		// Then apply text search if any
		if (!query) return base;
		const q = query.toLowerCase();
		return base.filter((r) =>
			filterColumns.some((col) => {
				const value = r[col as keyof CourseRow];
				return typeof value === 'string' && value.toLowerCase().includes(q);
			})
		);
	}, [rows, query, activeCourse, coursePriorities, selectedAllCourses, starredCourses, filterColumns]);

	// Multi-column sorting function
	const applyMultiSort = (items: CourseRow[], sortConfigs: SortConfig[]) => {
		if (sortConfigs.length === 0) return items;

		return [...items].sort((a, b) => {
			// Apply each sort config in order until a non-zero comparison is found
			for (const sort of sortConfigs) {
				if (sort.dir === 'none') continue;
				const k = sort.key as keyof CourseRow;
				let v1: string | number | boolean | undefined = a[k];
				let v2: string | number | boolean | undefined = b[k];

				// Handle undefined priority values by treating them as 0
				if (k === 'priority') {
					v1 = v1 === undefined ? 0 : v1;
					v2 = v2 === undefined ? 0 : v2;
				}

				// Special handling for the starred property - boolean comparison
				if (k === 'starred') {
					const b1 = v1 === true;
					const b2 = v2 === true;
					if (b1 !== b2) {
						return sort.dir === 'asc'
							? b1
								? 1
								: -1 // For ascending: false (not starred) comes before true (starred)
							: b1
							? -1
							: 1; // For descending: true (starred) comes before false (not starred)
					}
					continue;
				}

				// Special handling for section - convert to number for numeric sorting
				if (k === 'section') {
					const n1 = parseInt(v1 as string, 10);
					const n2 = parseInt(v2 as string, 10);
					if (!isNaN(n1) && !isNaN(n2)) {
						if (n1 < n2) return sort.dir === 'asc' ? -1 : 1;
						if (n1 > n2) return sort.dir === 'asc' ? 1 : -1;
						continue;
					}
				}

				// Special handling for time column - ensure days are sorted first (MW, RA, ST) and then by AM/PM
				if (k === 'time') {
					const t1 = v1 as string;
					const t2 = v2 as string;

					// Extract day patterns (assuming they appear at the start of the time string)
					const dayPattern1 = t1.substring(0, 2);
					const dayPattern2 = t2.substring(0, 2);

					// Define day pattern priority (MW, RA, ST, etc.)
					const dayPriority: Record<string, number> = { MW: 1, RA: 2, ST: 3 };

					// Compare day patterns first
					if (dayPattern1 !== dayPattern2) {
						const priority1 = dayPriority[dayPattern1] || 999;
						const priority2 = dayPriority[dayPattern2] || 999;
						if (priority1 < priority2) return sort.dir === 'asc' ? -1 : 1;
						if (priority1 > priority2) return sort.dir === 'asc' ? 1 : -1;
					}

					// If same day pattern, check AM/PM
					const isAM1 = t1.includes('AM');
					const isAM2 = t2.includes('AM');
					const isPM1 = t1.includes('PM');
					const isPM2 = t2.includes('PM');

					// AM should come before PM for same day pattern
					if (isAM1 && isPM2) return sort.dir === 'asc' ? -1 : 1;
					if (isPM1 && isAM2) return sort.dir === 'asc' ? 1 : -1;

					// If both are AM or both are PM, try to extract and compare the hour
					const hourMatch1 = t1.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
					const hourMatch2 = t2.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);

					if (hourMatch1 && hourMatch2) {
						const hour1 = parseInt(hourMatch1[1], 10);
						const hour2 = parseInt(hourMatch2[1], 10);

						if (hour1 < hour2) return sort.dir === 'asc' ? -1 : 1;
						if (hour1 > hour2) return sort.dir === 'asc' ? 1 : -1;
					}
				}

				// Normal string comparison for other fields
				if (typeof v1 === 'string') v1 = v1.toLowerCase();
				if (typeof v2 === 'string') v2 = v2.toLowerCase();

				// At this point v1 and v2 are guaranteed to be defined
				const value1 = v1 as string | number;
				const value2 = v2 as string | number;

				if (value1 < value2) return sort.dir === 'asc' ? -1 : 1;
				if (value1 > value2) return sort.dir === 'asc' ? 1 : -1;
			}
			return 0;
		});
	};

	const sorted = useMemo(() => {
		return applyMultiSort(filtered, sorts);
	}, [filtered, sorts]);

	const starredFiltered = useMemo(() => {
		const base = starredCourses.map((row) => ({
			...row,
			priority: coursePriorities[row.id] ?? undefined,
			starred: true,
		}));

		// First, filter by selected course codes if any
		let filtered = base;
		if (selectedStarredCourses.length > 0) {
			filtered = filtered.filter((r) => selectedStarredCourses.includes(r.courseCode));
		}

		// Then apply text search if any
		if (!starredQuery) return filtered;
		const q = starredQuery.toLowerCase();
		return filtered.filter((r) =>
			filterColumns.some((col) => {
				const value = r[col as keyof CourseRow];
				return typeof value === 'string' && value.toLowerCase().includes(q);
			})
		);
	}, [starredCourses, starredQuery, coursePriorities, selectedStarredCourses, filterColumns]);

	const starredSorted = useMemo(() => {
		return applyMultiSort(starredFiltered, sorts);
	}, [starredFiltered, sorts]);

	// UI helpers
	const toggleSort = (key: SortKey) => {
		setSorts((prevSorts) => {
			// Check if this column is already in the sort array
			const existingIndex = prevSorts.findIndex((s) => s.key === key);

			// If it exists, update its direction
			if (existingIndex >= 0) {
				const existing = prevSorts[existingIndex];
				const newSorts = [...prevSorts];

				// Cycle through sort states
				switch (existing.dir) {
					case 'none':
						newSorts[existingIndex] = { key, dir: 'asc' };
						break;
					case 'asc':
						newSorts[existingIndex] = { key, dir: 'desc' };
						break;
					case 'desc':
						// Remove this sort when cycling past 'desc'
						newSorts.splice(existingIndex, 1);
						break;
				}

				return newSorts;
			}

			// If not exists, add it with 'asc' direction
			return [...prevSorts, { key, dir: 'asc' }];
		});
	};

	const getSortInfo = (key: SortKey) => {
		const sortIndex = sorts.findIndex((s) => s.key === key);
		if (sortIndex === -1) return { active: false };

		return {
			active: true,
			direction: sorts[sortIndex].dir,
			order: sortIndex + 1,
		};
	};

	const header = (label: string, key: SortKey) => {
		const sortInfo = getSortInfo(key);
		return (
			<th key={label} onClick={() => toggleSort(key)} className="px-4 py-2 text-left text-sm font-semibold cursor-pointer select-none hover:underline text-inherit">
				{label}
				{sortInfo.active && sortInfo.direction !== 'none' && (
					<span>
						{` ${sortInfo.direction === 'asc' ? '↑' : '↓'}`}
						{sorts.length > 1 && ` (${sortInfo.order})`}
					</span>
				)}
			</th>
		);
	};

	// Filter menu logic
	const toggleFilterColumn = (column: string) => {
		setFilterColumns((prev) =>
			prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
		);
	};

	const handleFilterMenuClose = () => {
		if (filterColumns.length === 0) {
			setFilterColumns(['courseCode', 'facultyCode', 'room']);
		}
		setShowFilterMenu(false);
	};

	// Sidebar logic
	const addCourse = () => {
		const upperCaseCourse = inputCourse.toUpperCase().trim();
		const courseToAdd = rows.find((r) => r.courseCode.toUpperCase() === upperCaseCourse);
		if (courseToAdd && !savedCourses.some((saved) => saved.courseCode === courseToAdd.courseCode)) {
			setSavedCourses([...savedCourses, courseToAdd]);
			setInputCourse('');
			setShowDialog('added');
			setTimeout(() => setShowDialog(null), 3000);
		} else {
			setShowDialog('error');
			setTimeout(() => setShowDialog(null), 3000);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && inputCourse) {
			addCourse();
		}
	};

	const handleSelectCourse = (course: string) => {
		if (course === 'All Courses') {
			setActiveCourse(null);
			setInputCourse('');
			setSelectedAllCourses([]);
		} else {
			setActiveCourse(course);
			setQuery('');
			setSelectedAllCourses([]);
		}
	};

	const handleRemoveCourse = (course: string) => {
		setSavedCourses(savedCourses.filter((c) => c.courseCode !== course));
	};

	const handleDragStart = (course: string) => {
		setDragging(course);
	};

	const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
		e.preventDefault();
	};

	const handleDrop = (course: string) => {
		if (!dragging) return;
		const newOrder = savedCourses.filter((c) => c.courseCode !== dragging);
		const index = newOrder.findIndex((c) => c.courseCode === course);
		if (index === -1) return;
		newOrder.splice(index, 0, savedCourses.find((c) => c.courseCode === dragging)!);
		setSavedCourses(newOrder);
		setDragging(null);
	};

	// Toggle star for a course
	const toggleStar = (course: CourseRow) => {
		if (starredCourses.some((c) => c.id === course.id)) {
			setStarredCourses(starredCourses.filter((c) => c.id !== course.id));
			// Also remove from selected filtered courses if present
			setSelectedStarredCourses((prev) => prev.filter((code) => code !== course.courseCode));
		} else {
			setStarredCourses([...starredCourses, course]);
		}
	};

	// Toggle a course in the selected starred courses filter
	const toggleStarredCourseFilter = (courseCode: string) => {
		setSelectedStarredCourses((prev) => {
			if (prev.includes(courseCode)) {
				return prev.filter((code) => code !== courseCode);
			} else {
				return [...prev, courseCode];
			}
		});
	};

	// Toggle a course in the all courses filter
	const toggleAllCourseFilter = (courseCode: string) => {
		setSelectedAllCourses((prev) => {
			if (prev.includes(courseCode)) {
				return prev.filter((code) => code !== courseCode);
			} else {
				return [...prev, courseCode];
			}
		});
	};

	// Change priority for a course
	const changePriority = (course: CourseRow, priority: number) => {
		setCoursePriorities((prev) => ({
			...prev,
			[course.id]: priority,
		}));
	};

	// Clear all priority values after confirmation
	const clearAllPriorities = () => {
		setCoursePriorities({});
		setShowClearPriorityConfirm(false);
		setShowDialog('cleared');
		setTimeout(() => setShowDialog(null), 3000);
	};

	return (
		<div className={`flex min-h-screen transition-colors`}>
			{/* Sidebar */}
			<aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 m-4 p-4 space-y-6 bg-gray-800/80 backdrop-blur rounded-lg shadow-lg">
			<h2 className="text-xl font-semibold">Course Management</h2>
				<div className="space-y-2">
					<button
						onClick={() => {
							setView('all');
							setActiveCourse(null);
							setInputCourse('');
							setSelectedStarredCourses([]);
						}}
						className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${view === 'all' && !activeCourse ? 'bg-indigo-500 text-white' : ''} cursor-pointer`}
					>
						All Courses
					</button>
					{savedCourses.length === 0 && <p className="text-sm opacity-70 text-gray-400">No saved courses.</p>}
					{savedCourses.map((c) => (
						<button
							key={c.courseCode}
							onClick={() => {
								setView('all');
								handleSelectCourse(c.courseCode);
							}}
							onDragStart={() => handleDragStart(c.courseCode)}
							onDragOver={handleDragOver}
							onDrop={() => handleDrop(c.courseCode)}
							draggable
							className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${view === 'all' && activeCourse === c.courseCode ? 'bg-indigo-500 text-white' : ''} flex justify-between items-center cursor-pointer`}
						>
							{c.courseCode}
							<span
								onClick={(e) => {
									e.stopPropagation();
									handleRemoveCourse(c.courseCode);
								}}
								className="text-sm text-red-500 cursor-pointer"
							>
								❌
							</span>
						</button>
					))}
				</div>
				<div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={() => {
							setView('starred');
							setSelectedAllCourses([]);
						}}
						className={`w-full text-left px-3 py-2 rounded hover:bg-indigo-500/20 ${view === 'starred' ? 'bg-indigo-500 text-white' : ''} flex items-center cursor-pointer`}
					>
						<FaStar className="mr-2 text-yellow-400" />
						Starred Sections
					</button>
				</div>
				<div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
					<h3 className="text-sm font-medium">Add Course</h3>
					<input
						type="text"
						value={inputCourse}
						onChange={(e) => setInputCourse(e.target.value)}
						onKeyDown={handleKeyPress}
						placeholder="Search & add course"
						className="w-full border rounded p-2 bg-gray-900 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
					/>
					<ul className="space-y-2 max-h-60 overflow-y-auto">
						{courseOptions
							.filter((course) => course.toLowerCase().includes(inputCourse.toLowerCase()))
							.map((course) => (
								<li
									key={course}
									onClick={() => setInputCourse(course)}
									className="cursor-pointer hover:bg-indigo-500/20 px-3 py-2"
								>
									{course}
								</li>
							))}
					</ul>
					<button
						onClick={addCourse}
						className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded disabled:opacity-50 cursor-pointer"
						disabled={!inputCourse || savedCourses.some((c) => c.courseCode === inputCourse)}
					>
						Add
					</button>
					<button
						onClick={() => setShowClearPriorityConfirm(true)}
						className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 hover:text-white mt-2"
					>
						Clear All Priorities
					</button>
				</div>
				{showDialog === 'added' && (
					<div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
						Course Added!
					</div>
				)}
				{showDialog === 'error' && (
					<div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg">
						Course not found. Enter the course correctly.
					</div>
				)}
				{showDialog === 'cleared' && (
					<div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-md shadow-lg">
						All priorities cleared!
					</div>
				)}
			</aside>

			{/* Main Content */}
			<main className="flex-1 p-6 space-y-6">
				<div className="flex items-center justify-center">
					<Image src="/course_koi.png" alt="Course Koi" width={64} height={64} className="rounded-full mr-4" />
					<h1 className="text-5xl font-bold text-yellow-500">Course Koi?</h1>
				</div>
				{(view === 'all' || view === 'starred') && (
					<div className="flex justify-center mb-6 items-center space-x-4">
						<input
							type="text"
							value={view === 'all' ? query : starredQuery}
							onChange={(e) => (view === 'all' ? setQuery(e.target.value) : setStarredQuery(e.target.value))}
							placeholder="Search by course code, faculty code, or room number…"
							className="w-full max-w-lg border rounded p-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring focus:ring-indigo-500/40"
						/>
						<div className="relative">
							<button
								ref={filterButtonRef}
								onClick={() => setShowFilterMenu(!showFilterMenu)}
								className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer"
							>
								Filter by
							</button>
							{showFilterMenu && (
								<div
									ref={filterMenuRef}
									className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10"
								>
									<div className="p-2">
										{['courseCode', 'facultyCode', 'room', 'section', 'time'].map((col) => (
											<label key={col} className="flex items-center space-x-2 p-1 cursor-pointer">
												<input
													type="checkbox"
													checked={filterColumns.includes(col)}
													onChange={() => toggleFilterColumn(col)}
													className="form-checkbox h-4 w-4 text-indigo-600"
												/>
												<span className="text-sm capitalize">
													{col === 'courseCode' ? 'Course' : col === 'facultyCode' ? 'Faculty' : col}
												</span>
											</label>
										))}
									</div>
									<div className="p-2 border-t border-gray-200 dark:border-gray-700">
										<button
											onClick={handleFilterMenuClose}
											className="w-full text-center px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
										>
											Close
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
				{view === 'all' && savedCourses.length > 0 && !activeCourse && (
					<div className="mb-4">
						<div className="flex flex-wrap gap-2 justify-center">
							{Array.from(new Set(savedCourses.map((c) => c.courseCode)))
								.sort()
								.map((courseCode) => (
									<button
										key={courseCode}
										onClick={() => toggleAllCourseFilter(courseCode)}
										className={`px-2 py-1 text-xs rounded border ${
											selectedAllCourses.includes(courseCode)
												? 'bg-gray-600 text-white border-gray-600'
												: 'bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
										} flex items-center cursor-pointer`}
									>
										{courseCode}
										{selectedAllCourses.includes(courseCode) && (
											<span className="ml-1 inline-flex items-center">✕</span>
										)}
									</button>
								))}
						</div>
					</div>
				)}
				{view === 'starred' && starredCourses.length > 0 && (
					<div className="mb-4">
						<div className="flex flex-wrap gap-2 justify-center">
							{Array.from(new Set(starredCourses.map((c) => c.courseCode)))
								.sort()
								.map((courseCode) => (
									<button
										key={courseCode}
										onClick={() => toggleStarredCourseFilter(courseCode)}
										className={`px-2 py-1 text-xs rounded border ${
											selectedStarredCourses.includes(courseCode)
												? 'bg-gray-600 text-white border-gray-600'
												: 'bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
										} flex items-center cursor-pointer`}
									>
										{courseCode}
										{selectedStarredCourses.includes(courseCode) && (
											<span className="ml-1 inline-flex items-center">✕</span>
										)}
									</button>
								))}
						</div>
					</div>
				)}
				<div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
					<p>
						Set priority values to rank sections. Click column headers to sort. Click again to toggle
						ascending/descending/turn off sorting.
					</p>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full shadow rounded bg-white dark:bg-gray-800">
						<thead className="bg-gray-200 dark:bg-gray-700">
							<tr>
								{header('#', 'index')}
								{header('Course', 'courseCode')}
								{header('Section', 'section')}
								{header('Faculty', 'facultyCode')}
								{header('Time', 'time')}
								{header('Room', 'room')}
								{header('Seats', 'seat')}
								{header('Priority', 'priority')}
								{header('Star', 'starred')}
							</tr>
						</thead>
						<tbody>
							{(view === 'all' ? sorted : starredSorted).map((r, idx) => (
								<tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
									<td className="px-4 py-2">{idx + 1}</td>
									<td className="px-4 py-2">{r.courseCode}</td>
									<td className="px-4 py-2">{r.section}</td>
									<td className="px-4 py-2">{r.facultyCode}</td>
									<td className="px-4 py-2 whitespace-nowrap">{r.time}</td>
									<td className="px-4 py-2">{r.room}</td>
									<td className="px-4 py-2">{r.seat}</td>
									<td className="px-4 py-2">
										<div className="flex items-center">
											<input
												type="number"
												min="-10"
												max="10"
												value={r.priority ?? 0}
												onChange={(e) => changePriority(r, parseInt(e.target.value, 10) || 0)}
												className="w-12 h-8 text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
											/>
										</div>
									</td>
									<td className="px-4 py-2">
										<FaStar
											className={`cursor-pointer ${
												starredCourses.some((c) => c.id === r.id)
													? 'text-yellow-400'
													: 'text-gray-400'
											}`}
											onClick={() => toggleStar(r)}
										/>
									</td>
								</tr>
							))}
							{(view === 'all' ? sorted : starredSorted).length === 0 && (
								<tr>
									<td
										colSpan={9}
										className="p-4 text-center text-gray-400 dark:text-gray-500"
									>
										{view === 'all' ? 'No matching records.' : 'No starred courses.'}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</main>

			{/* Priority Clear Confirmation Modal - Positioned at the root level */}
			{showClearPriorityConfirm && (
				<div className="fixed inset-0 bg-gray-400/30 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-auto">
						<h3 className="text-lg font-bold mb-4">Clear All Priorities?</h3>
						<p className="mb-6">Are you sure you want to clear all priority values? This action cannot be undone.</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={() => setShowClearPriorityConfirm(false)}
								className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
							>
								Cancel
							</button>
							<button
								onClick={clearAllPriorities}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
							>
								Clear All
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}