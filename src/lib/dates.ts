import { format, isValid, parse, parseISO, startOfDay, subDays } from 'date-fns';

export const today = () => format(new Date(), 'yyyy-MM-dd');
export const daysAgo = (days: number) => format(subDays(startOfDay(new Date()), days), 'yyyy-MM-dd');

function parseAnyDate(value: string) {
  if (!value) return null;
  const raw = String(value).trim();

  const iso = parseISO(raw);
  if (isValid(iso)) return iso;

  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'MM/dd/yyyy',
    'M/d/yyyy',
    'MMM d, yyyy',
    'MMMM d, yyyy',
  ];

  for (const fmt of formats) {
    const parsed = parse(raw, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  const native = new Date(raw);
  return isValid(native) ? native : null;
}

export function toInputDate(value: string) {
  const parsed = parseAnyDate(value);
  return parsed ? format(parsed, 'yyyy-MM-dd') : today();
}

export function prettyDate(value: string) {
  const parsed = parseAnyDate(value);
  return parsed ? format(parsed, 'MMM d, yyyy') : 'Unknown date';
}

export function ageInDays(value: string) {
  const parsed = parseAnyDate(value);
  if (!parsed) return 0;
  return Math.floor((startOfDay(new Date()).getTime() - startOfDay(parsed).getTime()) / 86_400_000);
}

// Backward-compatible names used by demo code.
export const nDaysAgo = daysAgo;
export const pretty = prettyDate;
export const daysSince = ageInDays;