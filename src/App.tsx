import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Download,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Trash,
} from 'lucide-react';
import { Deadline, FilterStatus, SortOption } from './types/deadline';
import {
  calculateCountdown,
  detectBrowserTimeZone,
  findTimeZoneByCode,
  getTimeZoneAbbrAndIana,
  toUtcEpoch,
} from './utils/timezones';
import { exportAllDeadlinesIcs } from './utils/icsExport';
import { DeadlineCard } from './components/DeadlineCard';
import { DeadlineModal } from './components/DeadlineModal';
import { TimeZoneSelector } from './components/TimeZoneSelector';

const STORAGE_KEY = 'deadline_clock_items_v1';
const USER_TZ_KEY = 'deadline_clock_user_tz_v1';

export default function App() {
  // Detected browser time zone
  const [detectedTz] = useState<string>(() => detectBrowserTimeZone());

  // User-selected viewing time zone (defaults to browser detected)
  const [userTimeZone, setUserTimeZone] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(USER_TZ_KEY);
      return saved || detectBrowserTimeZone();
    } catch {
      return detectBrowserTimeZone();
    }
  });

  // Deadlines list — strictly empty until user adds one (Standing rule: Never add pre-filled fake deadlines)
  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Deadline[] = JSON.parse(saved);
        // Filter out any previous sample or fake deadlines
        return parsed.filter(
          (d) => !d.id.startsWith('sample-') && !d.title.toLowerCase().startsWith('sample:')
        );
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
    return [];
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('soonest');
  const [showExplainer, setShowExplainer] = useState(false);

  // Live countdown clock ticker (updates every second)
  const [currentNow, setCurrentNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save deadlines to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deadlines));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [deadlines]);

  // Save selected timezone to localStorage
  const handleTimeZoneChange = (newTz: string) => {
    setUserTimeZone(newTz);
    try {
      localStorage.setItem(USER_TZ_KEY, newTz);
    } catch (e) {
      console.error('Failed to save timezone preference', e);
    }
  };

  const handleResetToDetected = () => {
    handleTimeZoneChange(detectedTz);
  };

  // Label for active user timezone with IANA name next to the abbreviation (e.g. "EDT (America/Toronto)")
  const userTimeZoneLabel = useMemo(() => {
    return getTimeZoneAbbrAndIana(userTimeZone).formatted;
  }, [userTimeZone]);

  // Handlers for Add / Edit / Delete
  const handleOpenAddModal = () => {
    setEditingDeadline(null);
    setIsModalOpen(true);
  };

  const handleEdit = (deadline: Deadline) => {
    setEditingDeadline(deadline);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveDeadline = (deadlineData: Omit<Deadline, 'id' | 'createdAt'>) => {
    if (editingDeadline) {
      setDeadlines((prev) =>
        prev.map((d) => (d.id === editingDeadline.id ? { ...deadlineData, id: d.id, createdAt: d.createdAt } : d))
      );
    } else {
      const newDeadline: Deadline = {
        ...deadlineData,
        id: `deadline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };
      setDeadlines((prev) => [newDeadline, ...prev]);
    }
  };

  // Add one clearly labelled sample deadline on explicit user click
  const handleAddSampleDeadline = () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const sample: Deadline = {
      id: `sample-${Date.now()}`,
      title: 'Sample: Scholarship application (example)',
      date: targetDateStr,
      time: '23:59',
      timeZoneCode: 'PT',
      timeZoneIana: 'America/Los_Angeles',
      link: 'https://example.edu/scholarship',
      note: 'Sample deadline: 11:59 PM PT converts automatically to your time zone! Requires personal essay and unofficial transcript before the cutoff timer reaches zero.',
      createdAt: Date.now(),
      category: 'application',
    };

    setDeadlines([sample]);
  };

  // Calculate sorted and filtered deadlines
  const processedDeadlines = useMemo(() => {
    // First, attach target UTC epoch to each
    const withEpoch = deadlines.map((d) => {
      const targetUtcEpoch = toUtcEpoch(d.date, d.time, d.timeZoneIana);
      const remainingMs = targetUtcEpoch - currentNow;
      return {
        deadline: d,
        targetUtcEpoch,
        remainingMs,
      };
    });

    // Filter by search query
    let filtered = withEpoch;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.deadline.title.toLowerCase().includes(q) ||
          item.deadline.note?.toLowerCase().includes(q) ||
          item.deadline.timeZoneCode.toLowerCase().includes(q) ||
          item.deadline.category?.toLowerCase().includes(q)
      );
    }

    // Filter by status category
    if (filterStatus === 'urgent') {
      filtered = filtered.filter((item) => item.remainingMs > 0 && item.remainingMs < 24 * 3600 * 1000);
    } else if (filterStatus === 'approaching') {
      filtered = filtered.filter(
        (item) => item.remainingMs >= 24 * 3600 * 1000 && item.remainingMs < 3 * 24 * 3600 * 1000
      );
    } else if (filterStatus === 'upcoming') {
      filtered = filtered.filter((item) => item.remainingMs >= 3 * 24 * 3600 * 1000);
    } else if (filterStatus === 'passed') {
      filtered = filtered.filter((item) => item.remainingMs <= 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortOption === 'soonest') {
        // Upcoming first (soonest first), passed items sent to the end
        const aPassed = a.remainingMs <= 0;
        const bPassed = b.remainingMs <= 0;
        if (aPassed && !bPassed) return 1;
        if (!aPassed && bPassed) return -1;
        return a.targetUtcEpoch - b.targetUtcEpoch;
      } else if (sortOption === 'latest') {
        return b.targetUtcEpoch - a.targetUtcEpoch;
      } else if (sortOption === 'title') {
        return a.deadline.title.localeCompare(b.deadline.title);
      }
      return 0;
    });

    return filtered.map((item) => item.deadline);
  }, [deadlines, currentNow, searchQuery, filterStatus, sortOption]);

  // Counts for filter badges
  const counts = useMemo(() => {
    let urgent = 0;
    let approaching = 0;
    let upcoming = 0;
    let passed = 0;

    deadlines.forEach((d) => {
      const utc = toUtcEpoch(d.date, d.time, d.timeZoneIana);
      const rem = utc - currentNow;
      if (rem <= 0) {
        passed++;
      } else if (rem < 24 * 3600 * 1000) {
        urgent++;
      } else if (rem < 3 * 24 * 3600 * 1000) {
        approaching++;
      } else {
        upcoming++;
      }
    });

    return { all: deadlines.length, urgent, approaching, upcoming, passed };
  }, [deadlines, currentNow]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Bar Contract: 3 zones (Brand wordmark, Nav links/status, 1 primary action) */}
      <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-950/40">
              <Clock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap block">
                Deadline Clock
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block whitespace-nowrap">
                Multi-Timezone Cutoff Converter
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation / Quick stats */}
          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setShowExplainer(!showExplainer)}
              className="hover:text-slate-200 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>How Time Zones Shift Dates</span>
            </button>
            {deadlines.length > 0 && (
              <span className="text-slate-500">
                Tracking <strong className="text-slate-300 tabular-nums">{deadlines.length}</strong> deadline
                {deadlines.length === 1 ? '' : 's'}
              </span>
            )}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {deadlines.length > 0 && (
              <button
                type="button"
                onClick={() => exportAllDeadlinesIcs(deadlines)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
                title="Download all deadlines as an .ics calendar file"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export All (.ics)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm hover:shadow-sky-500/20 transition-all focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Add Deadline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Welcome Kicker Banner */}
        <section aria-label="Overview" className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Never Miss a Deadline to Time Zone Math
            </h1>
            <span className="text-xs text-sky-400 font-semibold tracking-wide">
              All dates converted to your local time automatically
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Hackathons, contests, and fellowships publish cutoffs like &quot;Oct 30, 11:59 PM PT&quot; or &quot;midnight ET&quot;.
            Deadline Clock converts each cutoff into your personal time zone, alerts you when the day shifts, and gives you a
            live countdown plus 1-click calendar export.
          </p>
        </section>

        {/* Explainer callout (expandable) */}
        {showExplainer && (
          <aside
            role="note"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-300 space-y-2"
          >
            <div className="flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                The Classic Student Time Zone Trap:
              </span>
              <button
                type="button"
                onClick={() => setShowExplainer(false)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="leading-relaxed">
              When a contest says <strong>&quot;Friday, Oct 30 at 11:59 PM PT&quot;</strong>, students on the US East Coast (ET)
              actually have until <strong>Saturday, Oct 31 at 2:59 AM ET</strong>. In Europe (CET) that is{' '}
              <strong>Saturday morning at 8:59 AM</strong>, and in India (IST) that is <strong>12:29 PM Saturday afternoon</strong>!
            </p>
            <p className="text-slate-400">
              Deadline Clock highlights these calendar shifts with a high-contrast warning badge on every card so you never
              scramble on the wrong day.
            </p>
          </aside>
        )}

        {/* Time Zone Bar */}
        <TimeZoneSelector
          userTimeZone={userTimeZone}
          userTimeZoneLabel={userTimeZoneLabel}
          detectedTimeZone={detectedTz}
          onTimeZoneChange={handleTimeZoneChange}
          onResetToDetected={handleResetToDetected}
        />

        {/* Controls Bar: Search, Filters & Sorters */}
        {deadlines.length > 0 && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deadlines by name or note..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none transition-colors"
                aria-label="Search deadlines"
              />
            </div>

            {/* Filter Tabs (Functional segmented controls) */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'urgent', label: '< 24h', count: counts.urgent, color: 'text-rose-400' },
                  { id: 'approaching', label: '< 3d', count: counts.approaching, color: 'text-amber-400' },
                  { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, color: 'text-emerald-400' },
                  { id: 'passed', label: 'Passed', count: counts.passed },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    filterStatus === tab.id
                      ? 'bg-slate-800 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      filterStatus === tab.id ? 'bg-slate-700 text-slate-100' : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Sorter */}
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="sort-select" className="text-xs text-slate-400 whitespace-nowrap">
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-sky-400 focus:outline-none transition-colors"
              >
                <option value="soonest">Soonest first</option>
                <option value="latest">Furthest first</option>
                <option value="title">Name (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Deadlines List */}
        {processedDeadlines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedDeadlines.map((deadline) => (
              <DeadlineCard
                key={deadline.id}
                deadline={deadline}
                userTimeZone={userTimeZone}
                userTimeZoneLabel={userTimeZoneLabel}
                currentNow={currentNow}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : deadlines.length === 0 ? (
          /* Empty State — Starting state per prompt requirement */
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 my-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-sky-400">
              <CalendarDays className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                No deadlines saved yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Add your upcoming hackathons, contests, fellowships, or scholarship deadlines. Everything is stored locally
                in your browser with zero sign-in required.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Your First Deadline</span>
              </button>

              <button
                type="button"
                onClick={handleAddSampleDeadline}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
                title="Add one clearly labelled sample deadline"
              >
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Add a sample deadline</span>
              </button>
            </div>
          </div>
        ) : (
          /* Search / Filter yielded no matches */
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 space-y-3">
            <p className="text-sm text-slate-400">No deadlines match the selected filter or search keyword.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Footer actions when list is populated */}
        {deadlines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => exportAllDeadlinesIcs(deadlines)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export All ({deadlines.length}) to Calendar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all saved deadlines? This cannot be undone.')) {
                  setDeadlines([]);
                }
              }}
              className="text-slate-500 hover:text-rose-400 transition-colors inline-flex items-center gap-1"
            >
              <Trash className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      <DeadlineModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeadline(null);
        }}
        onSave={handleSaveDeadline}
        editingDeadline={editingDeadline}
        userTimeZone={userTimeZone}
        userTimeZoneLabel={userTimeZoneLabel}
      />
    </div>
  );
}
