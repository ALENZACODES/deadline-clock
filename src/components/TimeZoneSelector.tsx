import React, { useState, useEffect } from 'react';
import { Globe, RotateCcw, Clock } from 'lucide-react';
import { COMMON_TIME_ZONES } from '../utils/timezones';

interface TimeZoneSelectorProps {
  userTimeZone: string;
  userTimeZoneLabel: string;
  detectedTimeZone: string;
  onTimeZoneChange: (ianaTz: string) => void;
  onResetToDetected: () => void;
}

export const TimeZoneSelector: React.FC<TimeZoneSelectorProps> = ({
  userTimeZone,
  userTimeZoneLabel,
  detectedTimeZone,
  onTimeZoneChange,
  onResetToDetected,
}) => {
  const [currentClockStr, setCurrentClockStr] = useState('');

  // Live ticking clock in selected timezone
  useEffect(() => {
    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimeZone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        });
        setCurrentClockStr(formatter.format(new Date()));
      } catch {
        setCurrentClockStr(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [userTimeZone]);

  const isOverridden = userTimeZone !== detectedTimeZone;

  // List of selectable target timezones: detected browser timezone + all common timezones
  const allSelectableTzs: { label: string; value: string }[] = [];

  // Add detected timezone first if not in common list
  const detectedInCommon = COMMON_TIME_ZONES.some((tz) => tz.iana === detectedTimeZone);
  if (!detectedInCommon) {
    allSelectableTzs.push({
      label: `Browser Auto-Detected (${detectedTimeZone})`,
      value: detectedTimeZone,
    });
  }

  // Ensure America/Toronto is in the list
  const hasToronto = COMMON_TIME_ZONES.some((tz) => tz.iana === 'America/Toronto');
  if (!hasToronto) {
    allSelectableTzs.push({
      label: 'America/Toronto · ET — Eastern Time (UTC-5 / UTC-4 (EDT))',
      value: 'America/Toronto',
    });
  }

  COMMON_TIME_ZONES.forEach((tz) => {
    allSelectableTzs.push({
      label: `${tz.iana} · ${tz.name} (${tz.offsetDescription})`,
      value: tz.iana,
    });
  });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-slate-800 rounded-lg text-sky-400">
          <Globe className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-200">Viewing Time Zone:</span>
            <span className="font-mono text-sky-300 font-semibold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
              {userTimeZoneLabel}
            </span>
            {isOverridden && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                Custom View
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 mt-1 font-mono tabular-nums">
            <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
            <span>Local now: {currentClockStr}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <label htmlFor="user-timezone-select" className="sr-only">
          Select display time zone
        </label>
        <select
          id="user-timezone-select"
          value={userTimeZone}
          onChange={(e) => onTimeZoneChange(e.target.value)}
          className="flex-1 sm:w-80 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-sky-400 focus:outline-none transition-colors"
        >
          {allSelectableTzs.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>

        {isOverridden && (
          <button
            type="button"
            onClick={onResetToDetected}
            title={`Reset to browser detected timezone (${detectedTimeZone})`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
