export interface ParsedLine {
  lineNumber: number;
  raw: string;
  date: string; // ISO yyyy-MM-dd
  time: string;
  spender: string;
  place: string;
  amount: number;
}

export interface FailedLine {
  lineNumber: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  parsed: ParsedLine[];
  failed: FailedLine[];
}

// `24/10/2020, 19:25 - Petar Lazić: aurelia tjestenina, 57.17`
const DATED_LINE = /^(?<date>\d{2}\/\d{2}\/\d{4}),\s(?<time>\d{2}:\d{2})\s-\s(?<spender>.+):\s*(?<place>.+),\s*(?<amount>[0-9+.\-*/\s]+)$/;

// `[24.10.2020., 19:25:00] Petar Lazić: aurelia tjestenina, 57.17`
const BRACKETED_LINE = /^\[(?<date>\d{2}\.\d{2}\.\d{4})\.,\s(?<time>\d{2}:\d{2}:\d{2})\]\s(?<spender>.+):\s*(?<place>.+),\s*(?<amount>[0-9+.]+)$/;

// Continuation line, same message as the previous dated line: `dolac, 30+12+12`
const CONTINUATION_LINE = /^\s*(?<place>.+),\s*(?<amount>[0-9+.]+)\s*$/;

function toIsoDate(day: string, month: string, year: string): string {
  return `${year}-${month}-${day}`;
}

/** Sums `+`-joined amounts (e.g. "30+12+12"); the original script's regex also
 * allowed `-`, `*`, `/` but its `eval` call only ever triggered on `+`, so
 * those are deliberately not supported here — same effective behavior. */
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.includes('+')) {
    const parts = trimmed.split('+').map((p) => parseFloat(p.trim()));
    if (parts.some((p) => Number.isNaN(p))) return null;
    return parts.reduce((sum, p) => sum + p, 0);
  }
  const value = parseFloat(trimmed);
  return Number.isNaN(value) ? null : value;
}

export function applyFixes(line: string, fixes: Record<string, string>): string {
  let result = line;
  for (const [from, to] of Object.entries(fixes)) {
    result = result.split(from).join(to);
  }
  return result;
}

export function parseWhatsAppExport(text: string, fixes: Record<string, string> = {}): ParseResult {
  const parsed: ParsedLine[] = [];
  const failed: FailedLine[] = [];

  let date = '';
  let time = '';
  let spender = '';

  const lines = text.split(/\r?\n/);
  lines.forEach((originalLine, index) => {
    const lineNumber = index + 1;
    const line = applyFixes(originalLine, fixes);
    if (line.trim() === '') return;

    let place: string | null = null;
    let amountRaw: string | null = null;

    const dated = line.match(DATED_LINE);
    const bracketed = !dated ? line.match(BRACKETED_LINE) : null;
    const continuation = !dated && !bracketed ? line.match(CONTINUATION_LINE) : null;

    if (dated?.groups) {
      const [day, month, year] = dated.groups.date.split('/');
      date = toIsoDate(day, month, year);
      time = dated.groups.time;
      spender = dated.groups.spender.trim();
      place = dated.groups.place.trim();
      amountRaw = dated.groups.amount;
    } else if (bracketed?.groups) {
      const [day, month, year] = bracketed.groups.date.split('.');
      date = toIsoDate(day, month, year);
      time = bracketed.groups.time;
      spender = bracketed.groups.spender.trim();
      place = bracketed.groups.place.trim();
      amountRaw = bracketed.groups.amount;
    } else if (continuation?.groups && date && spender) {
      // Only valid as a continuation once we've seen at least one dated line.
      place = continuation.groups.place.trim();
      amountRaw = continuation.groups.amount;
    } else {
      failed.push({ lineNumber, raw: originalLine, reason: 'No format matched' });
      return;
    }

    const amount = amountRaw === null ? null : parseAmount(amountRaw);
    if (amount === null || amount <= 0) {
      failed.push({ lineNumber, raw: originalLine, reason: 'Could not parse a positive amount' });
      return;
    }

    parsed.push({ lineNumber, raw: originalLine, date, time, spender, place: place ?? '', amount });
  });

  return { parsed, failed };
}
