export interface ParsedLine {
  lineNumber: number;
  raw: string;
  date: string; // ISO yyyy-MM-dd
  time: string;
  spender: string;
  place: string;
  amount: number;
}

/** Best-effort partial info extracted from a line that didn't fully parse,
 * used to prefill the manual-resolve form instead of leaving it blank. */
export interface ParseHint {
  date?: string; // ISO yyyy-MM-dd
  time?: string;
  spender?: string;
  place?: string;
  amount?: number;
}

export interface FailedLine {
  lineNumber: number;
  raw: string;
  reason: string;
  hint: ParseHint;
}

export interface ParseResult {
  parsed: ParsedLine[];
  failed: FailedLine[];
  autoSkipped: FailedLine[];
}

// `24/10/2020, 19:25 - Petar Lazić: aurelia tjestenina, 57.17`. Amount allows a
// leading `-` for downward corrections (e.g. someone lowering a prior entry).
const DATED_LINE = /^(?<date>\d{2}\/\d{2}\/\d{4}),\s(?<time>\d{2}:\d{2})\s-\s(?<spender>.+):\s*(?<place>.+),\s*(?<amount>-?[0-9+.*/\s]+)$/;

// `[24.10.2020., 19:25:00] Petar Lazić: aurelia tjestenina, 57.17`
const BRACKETED_LINE = /^\[(?<date>\d{2}\.\d{2}\.\d{4})\.,\s(?<time>\d{2}:\d{2}:\d{2})\]\s(?<spender>.+):\s*(?<place>.+),\s*(?<amount>-?[0-9+.]+)$/;

// Continuation line, same message as the previous dated line: `dolac, 30+12+12`
const CONTINUATION_LINE = /^\s*(?<place>.+),\s*(?<amount>-?[0-9+.]+)\s*$/;

// WhatsApp's own placeholder text for a deleted message — never a real
// expense, safe to auto-skip instead of asking the admin to dismiss each one.
const DELETED_MESSAGE = /(this message was deleted|you deleted this message)\s*$/i;

// Header-only versions of the two dated formats, used to salvage a partial
// date/time/spender (and the text after the colon) from lines whose tail
// doesn't fit the expected "place, amount" shape.
const DATED_HEADER = /^(?<date>\d{2}\/\d{2}\/\d{4}),\s(?<time>\d{2}:\d{2})\s-\s(?<spender>[^:]+):\s*(?<rest>.*)$/;
const BRACKETED_HEADER = /^\[(?<date>\d{2}\.\d{2}\.\d{4})\.,\s(?<time>\d{2}:\d{2}:\d{2})\]\s(?<spender>[^:]+):\s*(?<rest>.*)$/;

// Amount-then-place, the reverse of the usual order — e.g. "201, gorivo Dacia"
// instead of "gorivo Dacia, 201" (a common phone-typing slip).
const REVERSED_TAIL = /^\s*(?<amount>-?\d+(?:[.,]\d+)?)\s*,\s*(?<place>.+)$/;

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

/** Salvages whatever date/time/spender/place/amount can be read from a line
 * that failed full parsing, so the review UI can prefill instead of leaving
 * every field blank. */
export function extractHint(line: string): ParseHint {
  const hint: ParseHint = {};
  const dated = line.match(DATED_HEADER);
  const bracketed = !dated ? line.match(BRACKETED_HEADER) : null;
  let rest = line;

  if (dated?.groups) {
    const [day, month, year] = dated.groups.date.split('/');
    hint.date = toIsoDate(day, month, year);
    hint.time = dated.groups.time;
    hint.spender = dated.groups.spender.trim();
    rest = dated.groups.rest;
  } else if (bracketed?.groups) {
    const [day, month, year] = bracketed.groups.date.split('.');
    hint.date = toIsoDate(day, month, year);
    hint.time = bracketed.groups.time;
    hint.spender = bracketed.groups.spender.trim();
    rest = bracketed.groups.rest;
  }

  const reversed = rest.match(REVERSED_TAIL);
  if (reversed?.groups) {
    const amount = parseFloat(reversed.groups.amount.replace(',', '.'));
    if (!Number.isNaN(amount)) {
      hint.amount = amount;
      hint.place = reversed.groups.place.trim();
    }
  }

  return hint;
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
  const autoSkipped: FailedLine[] = [];

  let date = '';
  let time = '';
  let spender = '';

  const lines = text.split(/\r?\n/);
  lines.forEach((originalLine, index) => {
    const lineNumber = index + 1;
    // Strip a trailing comma some messages ended with by accident (e.g.
    // "gorivo, 200,") before pattern matching, so it doesn't break the match.
    const line = applyFixes(originalLine, fixes).replace(/,+\s*$/, '');
    if (line.trim() === '') return;

    if (DELETED_MESSAGE.test(line)) {
      autoSkipped.push({ lineNumber, raw: originalLine, reason: 'Deleted message', hint: {} });
      return;
    }

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
      failed.push({ lineNumber, raw: originalLine, reason: 'No format matched', hint: extractHint(line) });
      return;
    }

    const amount = amountRaw === null ? null : parseAmount(amountRaw);
    if (amount === null || amount === 0) {
      failed.push({
        lineNumber,
        raw: originalLine,
        reason: 'Could not parse a non-zero amount',
        hint: extractHint(line),
      });
      return;
    }

    parsed.push({ lineNumber, raw: originalLine, date, time, spender, place: place ?? '', amount });
  });

  return { parsed, failed, autoSkipped };
}
