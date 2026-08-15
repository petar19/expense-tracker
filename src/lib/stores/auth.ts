import { writable } from 'svelte/store';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { locale, type Locale } from '../i18n';

export type AllowedRole = 'admin' | 'user';

export const currentUser = writable<User | null>(null);
export const authInitializing = writable(true);
export const allowedRole = writable<AllowedRole | null>(null);
export const allowedLoading = writable(true);

let unsubAllowlist: (() => void) | null = null;

onAuthStateChanged(auth, async (user) => {
  currentUser.set(user);
  authInitializing.set(false);

  if (unsubAllowlist) {
    unsubAllowlist();
    unsubAllowlist = null;
  }

  if (!user || !user.email) {
    allowedRole.set(null);
    allowedLoading.set(false);
    return;
  }

  allowedLoading.set(true);
  const allowedRef = doc(db, 'allowedUsers', user.email.toLowerCase());
  unsubAllowlist = onSnapshot(
    allowedRef,
    (snap) => {
      allowedRole.set(snap.exists() ? (snap.data().role as AllowedRole) : null);
      allowedLoading.set(false);
    },
    () => {
      // Permission-denied is expected for a non-allowlisted user reading their own
      // (nonexistent) allowlist doc under the rules — treat as "not allowed".
      allowedRole.set(null);
      allowedLoading.set(false);
    },
  );

  // Load this user's last-selected language, if they've picked one before.
  getDoc(doc(db, 'users', user.uid))
    .then((snap) => {
      const savedLocale = snap.data()?.locale;
      if (savedLocale === 'en' || savedLocale === 'hr') locale.set(savedLocale);
    })
    .catch(() => {
      // Ignored: fails silently for non-allowlisted users under the rules, which is fine.
    });

  // Keep a users/{uid} profile doc up to date for other members to look up
  // display names/emails (e.g. when inviting to a group). Doesn't touch
  // `locale` — that's written separately by setUserLocale() below.
  await setDoc(
    doc(db, 'users', user.uid),
    {
      email: user.email,
      displayName: user.displayName ?? user.email,
      photoURL: user.photoURL ?? null,
    },
    { merge: true },
  ).catch(() => {
    // Ignored: fails silently for non-allowlisted users under the rules, which is fine.
  });
});

/** Changes the UI language and, if signed in, persists it as this user's
 * preference so it's restored automatically on their next sign-in/device. */
export async function setUserLocale(next: Locale) {
  locale.set(next);
  const user = auth.currentUser;
  if (!user) return;
  // merge (not update): may race the initial profile-doc creation on a
  // brand-new sign-in, so this must work whether or not the doc exists yet.
  await setDoc(doc(db, 'users', user.uid), { locale: next }, { merge: true }).catch(() => {});
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  await signOut(auth);
}
