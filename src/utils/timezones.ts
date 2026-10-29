import { StatusCategory, TimeZoneOption } from '../types/deadline';

// The common time zones requested: PT, MT, CT, ET, AT, NT, UTC, GMT/BST, CET, IST, AEST
// plus helpful extras like AoE (Anywhere on Earth, widely used in CS deadlines)
export const COMMON_TIME_ZONES: TimeZoneOption[] = [
  {
    code: 'PT',
    name: 'PT — Pacific Time',
    iana: 'America/Los_Angeles',
    region: 'North America (US/Canada)',
    offsetDescription: 'UTC-8 / UTC-7 (PDT)',
  },
  {
    code: 'MT',
    name: 'MT — Mountain Time',
    iana: 'America/Denver',
    region: 'North America (US/Canada)',
    offsetDescription: 'UTC-7 / UTC-6 (MDT)',
  },
  {
    code: 'CT',
    name: 'CT — Central Time',
    iana: 'America/Chicago',
    region: 'North America (US/Canada)',
    offsetDescription: 'UTC-6 / UTC-5 (CDT)',
  },
  {
    code: 'ET',
    name: 'ET — Eastern Time (America/New_York)',
    iana: 'America/New_York',
    region: 'North America (US)',
    offsetDescription: 'UTC-5 / UTC-4 (EDT)',
  },
  {
    code: 'ET-TORONTO',
    name: 'ET — Eastern Time (America/Toronto)',
    iana: 'America/Toronto',
    region: 'North America (Canada)',
    offsetDescription: 'UTC-5 / UTC-4 (EDT)',
  },
  {
    code: 'AT',
    name: 'AT — Atlantic Time',
    iana: 'America/Halifax',
    region: 'North America (Canada)',
    offsetDescription: 'UTC-4 / UTC-3 (ADT)',
  },
  {
    code: 'NT',
    name: 'NT — Newfoundland Time',
    iana: 'America/St_Johns',
    region: 'North America (Canada)',
    offsetDescription: 'UTC-3:30 / UTC-2:30 (NDT)',
  },
  {
    code: 'UTC',
    name: 'UTC — Coordinated Universal Time',
    iana: 'UTC',
    region: 'Universal / Standard',
    offsetDescription: 'UTC+0',
  },
  {
    code: 'GMT/BST',
    name: 'GMT/BST — UK Time',
    iana: 'Europe/London',
    region: 'Europe (UK)',
    offsetDescription: 'UTC+0 (GMT) / UTC+1 (BST)',
  },
  {
    code: 'CET',
    name: 'CET — Central European Time',
    iana: 'Europe/Paris',
    region: 'Europe',
    offsetDescription: 'UTC+1 (CET) / UTC+2 (CEST)',
  },
  {
    code: 'IST',
    name: 'IST — India Standard Time',
    iana: 'Asia/Kolkata',
    region: 'Asia (India)',
    offsetDescription: 'UTC+5:30',
  },
  {
    code: 'AEST',
    name: 'AEST — Australian Eastern Time',
    iana: 'Australia/Sydney',
    region: 'Australia',
    offsetDescription: 'UTC+10 / UTC+11 (AEDT)',
  },
  {
    code: 'AoE',
    name: 'AoE — Anywhere on Earth',
    iana: 'Etc/GMT+12',
    region: 'Global Academic & Hackathon Cutoff',
    offsetDescription: 'UTC-12 (Last place on Earth)',
  },
  {
    code: 'JST/KST',
    name: 'JST/KST — Japan & Korea Time',
    iana: 'Asia/Tokyo',
    region: 'Asia (Japan/Korea)',
    offsetDescription: 'UTC+9',
  },
  {
    code: 'SGT',
    name: 'SGT/HKT — Singapore & Hong Kong',
    iana: 'Asia/Singapore',
    region: 'Asia',
    offsetDescription: 'UTC+8',
  },
];

export function findTimeZoneByCode(code: string): TimeZoneOption | undefined {
  return COMMON_TIME_ZONES.find((tz) => tz.code === code);
}

export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Extracts wall-clock date components (year, month, day, hour, minute, second)
 * when an epoch millisecond value is rendered in a specific time zone.
 */
function getWallClockComponentsInTz(epochMs: number, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  const getPartVal = (type: string) => {
    const item = parts.find((p) => p.type === type);
    return item ? parseInt(item.value, 10) : 0;
  };

  let hour = getPartVal('hour');
  if (hour === 24) hour = 0;

  return {
    year: getPartVal('year'),
    month: getPartVal('month'), // 1-indexed
    day: getPartVal('day'),
    hour,
    minute: getPartVal('minute'),
    second: getPartVal('second'),
  };
}

/**
 * Converts a wall-clock date string (YYYY-MM-DD) and time string (HH:mm)
 * specified in a source IANA time zone into the exact UTC epoch timestamp (in milliseconds).
 * Handles daylight saving transitions cleanly using two-pass convergence.
 */
export function toUtcEpoch(dateStr: string, timeStr: string, timeZone: string): number {
  if (!dateStr) return Date.now();
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minStr] = (timeStr || '00:00').split(':');

  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10); // 1-12
  const targetDay = parseInt(dayStr, 10);
  const targetHour = parseInt(hourStr || '0', 10);
  const targetMinute = parseInt(minStr || '0', 10);

  const targetWallClockUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);

  // Initial estimate assuming target wall clock was UTC
  let guessUtc = targetWallClockUtc;

  // Pass 1: compute difference in timezone
  const pass1 = getWallClockComponentsInTz(guessUtc, timeZone);
  const pass1WallClockUtc = Date.UTC(pass1.year, pass1.month - 1, pass1.day, pass1.hour, pass1.minute, pass1.second);
  guessUtc += targetWallClockUtc - pass1WallClockUtc;

  // Pass 2: refine for daylight saving edge cases
  const pass2 = getWallClockComponentsInTz(guessUtc, timeZone);
  const pass2WallClockUtc = Date.UTC(pass2.year, pass2.month - 1, pass2.day, pass2.hour, pass2.minute, pass2.second);
  guessUtc += targetWallClockUtc - pass2WallClockUtc;

  return guessUtc;
}

/**
 * Extracts the time zone abbreviation (e.g. EDT, PST, GMT+1) and pairs it with the full IANA name.
 * e.g., "EDT (America/Toronto)" instead of "EDT (New York)"
 */
export function getTimeZoneAbbrAndIana(timeZone: string, date: Date = new Date()): { abbr: string; iana: string; formatted: string } {
  try {
    const match = Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName');
    const abbr = match?.value || '';
    const formatted = abbr ? `${abbr} (${timeZone})` : timeZone;
    return { abbr, iana: timeZone, formatted };
  } catch {
    return { abbr: '', iana: timeZone, formatted: timeZone };
  }
}

/**
 * Formats epoch timestamp into clean local display format with IANA name next to the abbreviation.
 * e.g., "Friday, Oct 30, 2026, 11:59 PM EDT (America/Toronto)"
 */
export function formatFullLocalDeadline(epochMs: number, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const formatted = formatter.format(new Date(epochMs));
    // Append the full IANA name next to the abbreviation
    return `${formatted} (${timeZone})`;
  } catch {
    return `${new Date(epochMs).toLocaleString()} (${timeZone})`;
  }
}

/**
 * Returns YYYY-MM-DD for an epoch timestamp in a given time zone.
 */
export function getDateStringInTimeZone(epochMs: number, timeZone: string): string {
  try {
    const c = getWallClockComponentsInTz(epochMs, timeZone);
    const y = c.year;
    const m = String(c.month).padStart(2, '0');
    const d = String(c.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return new Date(epochMs).toISOString().split('T')[0];
  }
}

/**
 * Checks whether the converted date in the user's viewing time zone
 * lands on a different calendar day compared to the posted date.
 * Crucial for deadlines like 11:59 PM PT that become 2:59 AM ET next day!
 */
export interface DateDifferenceReport {
  isDifferent: boolean;
  daysDiff: number; // e.g. +1 for next day, -1 for previous day
  userLocalDateStr: string;
  postedDateStr: string;
  userLocalShortDate: string;
  postedShortDate: string;
  userLocalTimeStr: string;
  message: string;
}

export function checkDateDifference(
  postedDateStr: string,
  utcEpochMs: number,
  userTimeZone: string,
  postedTimeZoneCode: string
): DateDifferenceReport {
  const userLocalDateStr = getDateStringInTimeZone(utcEpochMs, userTimeZone);
  const isDifferent = userLocalDateStr !== postedDateStr;

  let daysDiff = 0;
  if (isDifferent) {
    const postedParts = postedDateStr.split('-').map(Number);
    const userParts = userLocalDateStr.split('-').map(Number);
    const postedUtcDay = Date.UTC(postedParts[0], postedParts[1] - 1, postedParts[2]);
    const userUtcDay = Date.UTC(userParts[0], userParts[1] - 1, userParts[2]);
    daysDiff = Math.round((userUtcDay - postedUtcDay) / (1000 * 60 * 60 * 24));
  }

  // Format short readable versions for the alert chip
  const userDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const userLocalShortDate = userDateFormatter.format(new Date(utcEpochMs));
  const userLocalTimeStr = userTimeFormatter.format(new Date(utcEpochMs));

  // For posted short date, format postedDateStr
  const [py, pm, pd] = postedDateStr.split('-').map(Number);
  const postedApproxDate = new Date(Date.UTC(py, pm - 1, pd, 12, 0, 0));
  const postedShortDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(postedApproxDate);

  let message = '';
  if (isDifferent) {
    if (daysDiff > 0) {
      message = `Date shifted! Locally lands on ${userLocalShortDate} (+${daysDiff} day${daysDiff > 1 ? 's' : ''} after posted date)`;
    } else {
      const absDays = Math.abs(daysDiff);
      message = `Date shifted! Locally lands on ${userLocalShortDate} (${absDays} day${absDays > 1 ? 's' : ''} earlier than posted date)`;
    }
  }

  return {
    isDifferent,
    daysDiff,
    userLocalDateStr,
    postedDateStr,
    userLocalShortDate,
    postedShortDate,
    userLocalTimeStr,
    message,
  };
}

/**
 * Computes countdown breakdown (days, hours, minutes, seconds) from now until target UTC.
 */
export interface CountdownBreakdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalRemainingMs: number;
  isPassed: boolean;
  formattedCountdown: string;
}

export function calculateCountdown(targetEpochMs: number, currentNowMs: number = Date.now()): CountdownBreakdown {
  const diffMs = targetEpochMs - currentNowMs;
  const isPassed = diffMs <= 0;
  const absMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formattedCountdown = '';
  if (isPassed) {
    if (days > 0) {
      formattedCountdown = `Passed ${days}d ${hours}h ago`;
    } else if (hours > 0) {
      formattedCountdown = `Passed ${hours}h ${minutes}m ago`;
    } else if (minutes > 0) {
      formattedCountdown = `Passed ${minutes}m ${seconds}s ago`;
    } else {
      formattedCountdown = `Just passed`;
    }
  } else {
    if (days > 0) {
      formattedCountdown = `${days}d ${hours}h ${minutes}m left`;
    } else if (hours > 0) {
      formattedCountdown = `${hours}h ${minutes}m ${seconds}s left`;
    } else {
      formattedCountdown = `${minutes}m ${seconds}s left`;
    }
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalRemainingMs: diffMs,
    isPassed,
    formattedCountdown,
  };
}

/**
 * Returns color category and status per the requirements:
 * - red under 24 hours
 * - amber under 3 days
 * - green otherwise
 * - grey once passed
 */
export function getDeadlineStatus(remainingMs: number): {
  status: StatusCategory;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  pillBg: string;
} {
  if (remainingMs <= 0) {
    return {
      status: 'passed',
      label: 'Passed',
      bgClass: 'bg-slate-800/60',
      textClass: 'text-slate-400',
      borderClass: 'border-slate-700/60',
      pillBg: 'bg-slate-700/50 text-slate-300',
    };
  }

  const hoursRemaining = remainingMs / (1000 * 60 * 60);
  const daysRemaining = hoursRemaining / 24;

  if (hoursRemaining < 24) {
    return {
      status: 'urgent',
      label: 'Urgent · Under 24h',
      bgClass: 'bg-rose-950/20',
      textClass: 'text-rose-400',
      borderClass: 'border-rose-500/40',
      pillBg: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    };
  }

  if (daysRemaining < 3) {
    return {
      status: 'approaching',
      label: 'Approaching · Under 3d',
      bgClass: 'bg-amber-950/20',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/40',
      pillBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    };
  }

  return {
    status: 'upcoming',
    label: 'Upcoming',
    bgClass: 'bg-emerald-950/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    pillBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  };
}

/**
 * Formats original posted string:
 * e.g., "Oct 30, 2026, 11:59 PM PT"
 */
export function formatPostedOriginal(dateStr: string, timeStr: string, zoneCode: string): string {
  const [py, pm, pd] = dateStr.split('-').map(Number);
  const [ph, pmin] = (timeStr || '00:00').split(':').map(Number);

  // 12-hour format
  const hour12 = ph % 12 || 12;
  const ampm = ph >= 12 ? 'PM' : 'AM';
  const minFormatted = String(pmin).padStart(2, '0');

  // Month name
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[pm - 1] || 'Month';

  return `${monthName} ${pd}, ${py} · ${hour12}:${minFormatted} ${ampm} ${zoneCode}`;
}
