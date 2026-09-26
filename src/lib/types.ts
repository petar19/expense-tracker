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

// Cheap booleans purely deciding which tabs/sections show for this group —
// the actual config for an enabled capability lives in its own collection
// (whatsappIntegrations, photoSavingConfig below), same pattern either way,
// so permission rules stay simple and per-collection instead of needing
// field-level rules on this one document.
export interface GroupCapabilities {
  expenses: boolean;
  photoSaving: boolean;
}

export interface Group {
  id: string;
  name: string;
  members: Record<string, GroupMember>;
  memberUids: string[];
  capabilities: GroupCapabilities;
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

// whatsappIntegrations/{groupId} — doc id is the app group's own id, written
// by the admin panel and read live by the bot (no restart needed to pick up
// a change). Managed by that group's admin, not a site admin.
export interface WhatsAppIntegration {
  whatsappGroupJid: string | null;
  senderMap: Record<string, string>;
  announcementTemplate?: string;
}

// whatsappGroups/{jid} — every WhatsApp group the bot account can currently
// see, published by the bot on each connect so an admin can pick one from a
// dropdown instead of needing a jid from a CLI tool.
export interface DiscoveredWhatsAppGroup {
  jid: string;
  subject: string;
  lastSeenAt: number;
}

// whatsappIntegrations/{groupId}/unmappedSenders/{jid} — a WhatsApp sender
// the bot has seen in this group's linked chat but hasn't been mapped to an
// app member yet; written by the bot, resolved (and deleted) from the panel.
export interface UnmappedWhatsAppSender {
  jid: string;
  pushName: string;
  lastSeenAt: number;
}

// botStatus/whatsapp — a heartbeat the bot refreshes every few minutes so the
// panel can show it as online/offline without needing to reach the process.
export interface BotStatus {
  connected: boolean;
  lastSeenAt: number;
}

// photoSavingConfig/{groupId} — doc id is the app group's own id, same
// pattern as WhatsAppIntegration above. Config for a group's "Photo saving"
// capability: which WhatsApp chat's photos get saved to which local folder,
// and whether the OCR watcher should sort them. Site-admin only (unlike
// WhatsAppIntegration): it exposes a raw filesystem path on the bot's
// machine, which a plain group admin isn't necessarily trusted with.
export interface PhotoSavingConfig {
  whatsappGroupJid: string | null;
  folderPath: string;
  ocrEnabled: boolean;
  ocrInstruction?: string;
}

// groups/{groupId}/documents/{id} — a lightweight summary of one OCR'd
// receipt/bill, written by the OCR watcher (Admin SDK, bypasses rules).
// Deliberately excludes the full OCR text, which stays local-only next to
// the image — nothing here needs to search/display it.
export interface DocumentRecord {
  id: string;
  vendor: string;
  date: string | null;
  amount: number | null;
  category: string | null;
  sourceFile: string;
  processedAt: string;
}

// groups/{groupId}/documentVendors/{vendorSlug} — one doc per vendor
// "folder", same aggregate pattern as KnownName above, so the Documents tab
// can list vendors cheaply without loading every document up front.
export interface DocumentVendor {
  displayName: string;
  count: number;
  lastDocumentAt: string;
}
