export interface GroupMember {
  role: 'admin' | 'member';
  expectedPct: number;
  displayName: string;
  email: string;
}

// groups/{groupId}/notificationPrefs/{uid} — kept out of the shared `members`
// map so the security rule can cleanly scope "you may only touch your own
// preference" without needing to diff one nested key inside a shared field.
export interface NotificationPref {
  uid: string;
  enabled: boolean;
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
  source: 'manual' | 'migrated' | 'whatsapp-bot';
}

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  color?: string;
}

export interface KnownName {
  name: string; // normalized key (doc id)
  displayName: string;
  count: number;
  lastUsed: number;
}

export interface NameAlias {
  id: string;
  names: string[];
  canonicalName: string;
}
