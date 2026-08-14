export interface GroupMember {
  role: 'admin' | 'member';
  expectedPct: number;
  displayName: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  members: Record<string, GroupMember>;
  memberUids: string[];
}

export interface Subitem {
  name: string;
  price: number;
  count?: number;
}

export interface ExpenseLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface Expense {
  id: string;
  name: string;
  description?: string;
  price: number;
  itemCount?: number;
  paidBy: string;
  categories: string[];
  date: string; // ISO date (yyyy-MM-dd)
  location: ExpenseLocation | null;
  subitems: Subitem[];
  createdBy: string;
  createdAt: number;
  source: 'manual' | 'migrated';
}

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  color?: string;
}

export interface KnownName {
  name: string;
  count: number;
  lastUsed: number;
}

export interface NameAlias {
  id: string;
  names: string[];
  canonicalName: string;
}
