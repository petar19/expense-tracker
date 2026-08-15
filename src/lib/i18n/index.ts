import { derived, writable } from 'svelte/store';
import { en } from './en';
import { hr } from './hr';

export type Locale = 'en' | 'hr';

const STORAGE_KEY = 'expense-tracker:locale';

function detectDefault(): Locale {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hr') return saved;
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('hr')) {
    return 'hr';
  }
  return 'en';
}

export const locale = writable<Locale>(detectDefault());

locale.subscribe((value) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
});

const dictionaries: Record<Locale, Record<string, string>> = { en, hr };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Usage in templates: `{$t('nav.expenses')}` or `{$t('groups.memberCount', { count: 3 })}`. */
export const t = derived<typeof locale, Translate>(locale, ($locale) => {
  return (key: string, vars?: Record<string, string | number>) =>
    interpolate(dictionaries[$locale][key] ?? dictionaries.en[key] ?? key, vars);
});
