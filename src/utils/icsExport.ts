import { Deadline } from '../types/deadline';
import { formatPostedOriginal, toUtcEpoch } from './timezones';

function formatIcsDate(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateIcsContent(deadline: Deadline): string {
  const deadlineUtcEpoch = toUtcEpoch(deadline.date, deadline.time, deadline.timeZoneIana);
  const startUtcStr = formatIcsDate(deadlineUtcEpoch);
  // Default deadline event duration: 30 minutes ending at the cutoff
  const endUtcStr = formatIcsDate(deadlineUtcEpoch + 30 * 60 * 1000);
  const stampStr = formatIcsDate(Date.now());
  const uid = `deadline-${deadline.id}-${Date.now()}@deadlineclock.app`;

  const postedInfo = formatPostedOriginal(deadline.date, deadline.time, deadline.timeZoneCode);

  let descriptionLines: string[] = [
    `Deadline: ${deadline.title}`,
    `Original posted time: ${postedInfo} (${deadline.timeZoneIana})`,
  ];

  if (deadline.link) {
    descriptionLines.push(`Link: ${deadline.link}`);
  }
  if (deadline.note) {
    descriptionLines.push(`Notes: ${deadline.note}`);
  }
  descriptionLines.push('Converted and exported via Deadline Clock.');

  const descriptionEscaped = escapeIcsText(descriptionLines.join('\n'));
  const summaryEscaped = escapeIcsText(`[DEADLINE] ${deadline.title}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Clock//Multi-Timezone Deadline Converter//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stampStr}`,
    `DTSTART:${startUtcStr}`,
    `DTEND:${endUtcStr}`,
    `SUMMARY:${summaryEscaped}`,
    `DESCRIPTION:${descriptionEscaped}`,
    deadline.link ? `URL:${deadline.link}` : '',
    'STATUS:CONFIRMED',
    // 24 Hour Alarm Reminder
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeIcsText(deadline.title)} deadline is in 24 hours!`,
    'TRIGGER:-P1D',
    'END:VALARM',
    // 1 Hour Alarm Reminder
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:Urgent: ${escapeIcsText(deadline.title)} deadline in 1 hour! Submit now.`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleDeadlineIcs(deadline: Deadline) {
  const content = generateIcsContent(deadline);
  const safeTitle = deadline.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const filename = `${safeTitle || 'deadline'}-${deadline.date}.ics`;
  downloadIcsFile(filename, content);
}

export function exportAllDeadlinesIcs(deadlines: Deadline[]) {
  if (deadlines.length === 0) return;
  const stampStr = formatIcsDate(Date.now());

  const eventBlocks = deadlines.map((d) => {
    const deadlineUtcEpoch = toUtcEpoch(d.date, d.time, d.timeZoneIana);
    const startUtcStr = formatIcsDate(deadlineUtcEpoch);
    const endUtcStr = formatIcsDate(deadlineUtcEpoch + 30 * 60 * 1000);
    const uid = `deadline-${d.id}@deadlineclock.app`;
    const postedInfo = formatPostedOriginal(d.date, d.time, d.timeZoneCode);

    let desc = `Deadline: ${d.title}\nOriginal posted time: ${postedInfo} (${d.timeZoneIana})`;
    if (d.link) desc += `\nLink: ${d.link}`;
    if (d.note) desc += `\nNotes: ${d.note}`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stampStr}`,
      `DTSTART:${startUtcStr}`,
      `DTEND:${endUtcStr}`,
      `SUMMARY:${escapeIcsText(`[DEADLINE] ${d.title}`)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      d.link ? `URL:${d.link}` : '',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeIcsText(d.title)} deadline is in 24 hours!`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Urgent: ${escapeIcsText(d.title)} deadline in 1 hour!`,
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  const fullContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Clock//Multi-Timezone Deadline Converter//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');

  const filename = `all-deadlines-${new Date().toISOString().split('T')[0]}.ics`;
  downloadIcsFile(filename, fullContent);
}
