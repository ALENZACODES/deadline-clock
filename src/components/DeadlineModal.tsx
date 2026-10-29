import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, Globe, Link, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { Deadline } from '../types/deadline';
import {
  COMMON_TIME_ZONES,
  checkDateDifference,
  findTimeZoneByCode,
  formatFullLocalDeadline,
  toUtcEpoch,
} from '../utils/timezones';

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadlineData: Omit<Deadline, 'id' | 'createdAt'>) => void;
  editingDeadline?: Deadline | null;
  userTimeZone: string;
  userTimeZoneLabel: string;
}

export const DeadlineModal: React.FC<DeadlineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDeadline,
  userTimeZone,
  userTimeZoneLabel,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('23:59');
  const [timeZoneCode, setTimeZoneCode] = useState('PT');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Deadline['category']>('hackathon');
  const [formError, setFormError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Set default or existing values when modal opens
  useEffect(() => {
    if (editingDeadline) {
      setTitle(editingDeadline.title);
      setDate(editingDeadline.date);
      setTime(editingDeadline.time);
      setTimeZoneCode(editingDeadline.timeZoneCode);
      setLink(editingDeadline.link || '');
      setNote(editingDeadline.note || '');
      setCategory(editingDeadline.category || 'hackathon');
    } else {
      // Default new deadline: tomorrow at 11:59 PM PT
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDateStr = tomorrow.toISOString().split('T')[0];
      setTitle('');
      setDate(defaultDateStr);
      setTime('23:59');
      setTimeZoneCode('PT');
      setLink('');
      setNote('');
      setCategory('hackathon');
    }
    setFormError('');
  }, [editingDeadline, isOpen]);

  // Focus management & Escape key listener
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Selected posted time zone definition
  const selectedTzObj = findTimeZoneByCode(timeZoneCode) || COMMON_TIME_ZONES[0];

  // Calculate live preview of converted time
  let previewUtcEpoch = 0;
  let previewLocalStr = '';
  let dateDiffReport = null;

  if (date && time) {
    previewUtcEpoch = toUtcEpoch(date, time, selectedTzObj.iana);
    previewLocalStr = formatFullLocalDeadline(previewUtcEpoch, userTimeZone);
    dateDiffReport = checkDateDifference(date, previewUtcEpoch, userTimeZone, timeZoneCode);
  }

  // Quick Date Helpers
  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a deadline title or contest name.');
      return;
    }
    if (!date) {
      setFormError('Please choose the posted cutoff date.');
      return;
    }
    if (!time) {
      setFormError('Please choose the posted cutoff time.');
      return;
    }

    let cleanLink = link.trim();
    if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
      cleanLink = `https://${cleanLink}`;
    }

    onSave({
      title: title.trim(),
      date,
      time,
      timeZoneCode: selectedTzObj.code,
      timeZoneIana: selectedTzObj.iana,
      link: cleanLink || undefined,
      note: note.trim() || undefined,
      category,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-xl my-8 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 id="modal-headline" className="text-lg font-bold text-white tracking-tight">
              {editingDeadline ? 'Edit Deadline' : 'Add New Deadline'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the exact time and zone posted by the organizer. We will convert it automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Deadline Name */}
          <div>
            <label htmlFor="deadline-name" className="block text-xs font-semibold text-slate-300 mb-1">
              Deadline / Contest Name <span className="text-rose-400">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="deadline-name"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CalHacks 12.0 Application, GSoC Proposal, NSF Fellowship"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'hackathon', label: 'Hackathon' },
                  { id: 'contest', label: 'Contest / Competition' },
                  { id: 'application', label: 'Application' },
                  { id: 'fellowship', label: 'Fellowship / Grant' },
                  { id: 'other', label: 'Other' },
                ] as const
              ).map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    category === cat.id
                      ? 'bg-sky-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid: Date, Time & Posted Time Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="deadline-date" className="text-xs font-semibold text-slate-300">
                  Posted Date <span className="text-rose-400">*</span>
                </label>
              </div>
              <input
                id="deadline-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:border-sky-400 focus:outline-none transition-colors font-mono"
              />
              {/* Quick Date Presets */}
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="hover:text-sky-300 underline underline-offset-2"
                >
                  Today
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="hover:text-sky-300 underline underline-offset-2"
                >
                  Tmrw
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setQuickDate(3)}
                  className="hover:text-sky-300 underline underline-offset-2"
                >
                  +3d
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="hover:text-sky-300 underline underline-offset-2"
                >
                  +1w
                </button>
              </div>
            </div>

            {/* Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="deadline-time" className="text-xs font-semibold text-slate-300">
                  Posted Time <span className="text-rose-400">*</span>
                </label>
              </div>
              <input
                id="deadline-time"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:border-sky-400 focus:outline-none transition-colors font-mono"
              />
              {/* Quick Time Presets */}
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setTime('23:59')}
                  className="hover:text-sky-300 underline underline-offset-2"
                  title="11:59 PM (End of day)"
                >
                  11:59 PM
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setTime('00:00')}
                  className="hover:text-sky-300 underline underline-offset-2"
                  title="Midnight (00:00)"
                >
                  Midnight
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setTime('17:00')}
                  className="hover:text-sky-300 underline underline-offset-2"
                  title="5:00 PM (Close of business)"
                >
                  5 PM
                </button>
              </div>
            </div>

            {/* Time Zone it was posted in */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="deadline-timezone" className="text-xs font-semibold text-slate-300">
                  Posted Time Zone <span className="text-rose-400">*</span>
                </label>
              </div>
              <select
                id="deadline-timezone"
                value={timeZoneCode}
                onChange={(e) => setTimeZoneCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:border-sky-400 focus:outline-none transition-colors"
              >
                {COMMON_TIME_ZONES.map((tz) => (
                  <option key={tz.code} value={tz.code}>
                    {tz.code} ({tz.offsetDescription})
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400 mt-1.5 truncate" title={selectedTzObj.name}>
                {selectedTzObj.name}
              </div>
            </div>
          </div>

          {/* Live Conversion Preview Box */}
          {previewLocalStr && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-sky-300">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  Live Conversion to Your Time Zone ({userTimeZoneLabel}):
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white tabular-nums">{previewLocalStr}</div>

              {/* Date difference warning alert right in the form */}
              {dateDiffReport?.isDifferent && (
                <div className="pt-2 border-t border-slate-800 flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <strong>Caution: </strong>
                    This deadline lands on{' '}
                    <span className="font-semibold underline decoration-amber-400">
                      {dateDiffReport.userLocalShortDate}
                    </span>{' '}
                    locally ({dateDiffReport.daysDiff > 0 ? '+1 day later' : 'previous day'})!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optional Link */}
          <div>
            <label htmlFor="deadline-link" className="block text-xs font-semibold text-slate-300 mb-1">
              Optional Link / Submission Portal URL
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
              <input
                id="deadline-link"
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://devpost.com/submit or https://grants.gov"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="deadline-note" className="block text-xs font-semibold text-slate-300 mb-1">
              Optional Note / Requirements Checklist
            </label>
            <textarea
              id="deadline-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Requires 2 recommendation letters and PDF slide deck. Confirm team members 1 hr prior."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {editingDeadline ? 'Update Deadline' : 'Save Deadline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
