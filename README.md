# HouseOps

A household management app — started as shared expense tracking, now covers receipt/bill archiving with OCR too, with more household automation planned. Built with Svelte 5 + Vite, Firebase (Auth + Firestore) as the backend, deployed to GitHub Pages. Paired with a [WhatsApp bot](../expense-tracker-bot) that bridges chats into the app.

## Groups and capabilities

A **group** is a named container with a checklist of enabled capabilities — not every group needs every feature:

- **Expenses**: members, percentage-based expected shares, a linked WhatsApp chat for logging `name, amount` messages as expenses, stats, and settle-up ("who owes whom").
- **Photo saving**: a linked WhatsApp chat whose photos get saved to a folder on the machine running the bot — e.g. a family "bills" chat, or a "Trip" group with no expense tracking at all. An OCR toggle (Gemini-powered, run by a separate script — see the bot repo) sorts photos into vendor-named folders and extracts vendor/date/amount/category into the app's **Documents** tab.

A group's Settings tab (site-admin only for anything touching the bot's filesystem) is where all of this is configured — pick a WhatsApp chat, a folder, toggle OCR, customize its extraction instruction. The active group is picked from the switcher in the nav; which tabs show up depends on that group's enabled capabilities.

Site-wide settings (who's allowed to sign in, running a one-off WhatsApp-export migration) live in the admin panel — the gear icon next to the language picker, admin accounts only.

## Setup

```bash
npm install
npm run dev
```

Firebase config lives directly in `src/lib/firebase.ts` (the API key is public by design for Firebase web apps — access control is entirely in `firestore.rules`, not in hiding that config).

- `npm run check` — svelte-check + TypeScript
- `npm run test` — vitest
- `npm run build` — production build, deployed automatically to GitHub Pages on push to `master` via GitHub Actions

## Firestore rules

`firestore.rules` is the actual security boundary — deploy after any change:

```bash
firebase deploy --only firestore:rules --project expense-tracker-5acdb
```
