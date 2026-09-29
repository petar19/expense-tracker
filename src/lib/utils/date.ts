// Deliberately not `.toISOString().slice(0, 10)`, which converts to UTC
// first — on a positive-UTC-offset timezone that shifts local midnight back
// across the UTC day boundary and reports the previous calendar day (e.g.
// just after midnight local time, or when building a month/week boundary).
export function toIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIso(new Date());
}
