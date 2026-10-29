import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Deadline } from '../types/deadline';
import {
  calculateCountdown,
  checkDateDifference,
  formatFullLocalDeadline,
  formatPostedOriginal,
  getDeadlineStatus,
  toUtcEpoch,
} from '../utils/timezones';
import { exportSingleDeadlineIcs } from '../utils/icsExport';

interface DeadlineCardProps {
  deadline: Deadline;
  userTimeZone: string;
  userTimeZoneLabel: string;
  currentNow: number;
  onEdit: (deadline: Deadline) => void;
  onDelete: (id: string) => void;
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({
  deadline,
  userTimeZone,
  userTimeZoneLabel,
  currentNow,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Compute exact UTC timestamp
  const targetUtcMs = toUtcEpoch(deadline.date, deadline.time, deadline.timeZoneIana);

  // Compute live countdown
  const countdown = calculateCountdown(targetUtcMs, currentNow);

  // Compute color status badge
  const status = getDeadlineStatus(countdown.totalRemainingMs);

  // Check for date shift between original posted date and converted local date
  const dateDiff = checkDateDifference(deadline.date, targetUtcMs, userTimeZone, deadline.timeZoneCode);

  // Format local deadline
  const localFormatted = formatFullLocalDeadline(targetUtcMs, userTimeZone);
  const postedFormatted = formatPostedOriginal(deadline.date, deadline.time, deadline.timeZoneCode);

  const handleCopyLocal = async () => {
    try {
      await navigator.clipboard.writeText(`${deadline.title}: ${localFormatted}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <article
      aria-labelledby={`deadline-title-${deadline.id}`}
      className={`relative rounded-xl border bg-slate-900/90 transition-all duration-150 p-5 shadow-sm hover:border-slate-600 ${
        status.status === 'urgent'
          ? 'border-rose-500/50 shadow-rose-950/20'
          : status.status === 'approaching'
          ? 'border-amber-500/50 shadow-amber-950/20'
          : status.status === 'passed'
          ? 'border-slate-800 opacity-80'
          : 'border-slate-800'
      }`}
    >
      {/* Top row: Status Badge & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Explicit status badge with text & accessible contrast */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${status.pillBg}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.status === 'urgent'
                  ? 'bg-rose-400 animate-pulse'
                  : status.status === 'approaching'
                  ? 'bg-amber-400'
                  : status.status === 'upcoming'
                  ? 'bg-emerald-400'
                  : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            {status.label}
          </span>

          {deadline.category && (
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-800 rounded">
              {deadline.category}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => exportSingleDeadlineIcs(deadline)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            title="Download .ics calendar file"
            aria-label={`Export ${deadline.title} to iCalendar`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLocal}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            title="Copy local converted deadline to clipboard"
            aria-label="Copy local deadline text"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onEdit(deadline)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            title="Edit deadline"
            aria-label={`Edit ${deadline.title}`}
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(deadline.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-950/40 rounded transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
            title="Delete deadline"
            aria-label={`Delete ${deadline.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-3.5 pb-2">
        {/* Title and external link */}
        <div className="flex items-start justify-between gap-3">
          <h3
            id={`deadline-title-${deadline.id}`}
            className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug"
          >
            {deadline.title}
          </h3>

          {deadline.link && (
            <a
              href={deadline.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline shrink-0 pt-0.5"
              aria-label={`Open website for ${deadline.title} (opens in a new tab)`}
            >
              <span>Visit Link</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        {/* Big Converted Local Time Output */}
        <div className="mt-3 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/90">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              Your Local Deadline ({userTimeZoneLabel}):
            </span>
          </div>
          <div className="text-base sm:text-xl font-bold text-sky-100 tracking-tight tabular-nums">
            {localFormatted}
          </div>

          {/* Original Posted Time Underneath */}
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
            <span className="text-slate-500 font-medium">Original posted cutoff:</span>
            <span className="font-semibold text-slate-300 tabular-nums">{postedFormatted}</span>
          </div>
        </div>

        {/* Warning Chip for Date Shift (Special core rule!) */}
        {dateDiff.isDifferent && (
          <div
            role="alert"
            className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-200 text-xs leading-relaxed"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold text-amber-300">Date shift warning: </span>
              In your time zone, this deadline lands on{' '}
              <strong className="underline decoration-amber-400 text-white font-semibold">
                {dateDiff.userLocalShortDate}
              </strong>{' '}
              ({dateDiff.daysDiff > 0 ? `+${dateDiff.daysDiff} day later` : `${Math.abs(dateDiff.daysDiff)} day earlier`}),{' '}
              not the posted {dateDiff.postedShortDate}! Be sure not to submit a day late.
            </div>
          </div>
        )}

        {/* Live Countdown Grid / Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Countdown:</span>
            <div
              className={`font-mono text-sm sm:text-base font-bold tabular-nums tracking-wide ${
                status.status === 'urgent'
                  ? 'text-rose-400'
                  : status.status === 'approaching'
                  ? 'text-amber-400'
                  : status.status === 'passed'
                  ? 'text-slate-500'
                  : 'text-emerald-400'
              }`}
            >
              {countdown.isPassed ? (
                countdown.formattedCountdown
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-100">{countdown.days}d</span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-100">
                    {String(countdown.hours).padStart(2, '0')}h
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-100">
                    {String(countdown.minutes).padStart(2, '0')}m
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-100 text-xs">
                    {String(countdown.seconds).padStart(2, '0')}s
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Quick note toggle */}
          {deadline.note && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showNotes ? 'Hide note' : 'View note'}</span>
              {showNotes ? (
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Notes */}
        {showNotes && deadline.note && (
          <div className="mt-3 p-3 bg-slate-950/80 rounded border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {deadline.note}
          </div>
        )}
      </div>
    </article>
  );
};
