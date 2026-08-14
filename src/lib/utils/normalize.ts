const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/** Lowercase, strip Croatian diacritics, collapse whitespace/punctuation. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized === '' ? [] : normalized.split(' ');
}

/** Whitespace-stripped form, used for "zoo city" vs "zoocity" style comparisons. */
export function stripped(text: string): string {
  return normalizeText(text).replace(/\s+/g, '');
}
