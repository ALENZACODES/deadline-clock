export interface Deadline {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD in the posted time zone
  time: string; // HH:mm (24-hour) in the posted time zone
  timeZoneCode: string; // e.g. "PT", "ET", "UTC"
  timeZoneIana: string; // e.g. "America/Los_Angeles"
  link?: string;
  note?: string;
  createdAt: number;
  category?: 'hackathon' | 'contest' | 'application' | 'fellowship' | 'other';
}

export interface TimeZoneOption {
  code: string;
  name: string;
  iana: string;
  region: string;
  offsetDescription: string;
}

export type StatusCategory = 'urgent' | 'approaching' | 'upcoming' | 'passed';

export type FilterStatus = 'all' | 'urgent' | 'approaching' | 'upcoming' | 'passed';
export type SortOption = 'soonest' | 'latest' | 'title';
