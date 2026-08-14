import { writable } from 'svelte/store';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

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

  // Keep a users/{uid} profile doc up to date for other members to look up
  // display names/emails (e.g. when inviting to a group).
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

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  await signOut(auth);
}
