import { get, writable } from 'svelte/store';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { activeGroup } from './groups';
import { currentUser } from './auth';
import { normalizeText } from '../utils/normalize';
import type { Expense, KnownName } from '../types';

export const expenses = writable<Expense[]>([]);
export const expensesLoading = writable(true);
export const knownNames = writable<KnownName[]>([]);

let unsubExpenses: (() => void) | null = null;
let unsubKnownNames: (() => void) | null = null;

activeGroup.subscribe((group) => {
  if (unsubExpenses) {
    unsubExpenses();
    unsubExpenses = null;
  }
  if (unsubKnownNames) {
    unsubKnownNames();
    unsubKnownNames = null;
  }

  if (!group) {
    expenses.set([]);
    expensesLoading.set(false);
    knownNames.set([]);
    return;
  }

  expensesLoading.set(true);
  const expensesQuery = query(
    collection(db, 'groups', group.id, 'expenses'),
    orderBy('date', 'desc'),
  );
  unsubExpenses = onSnapshot(
    expensesQuery,
    (snap) => {
      expenses.set(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) })));
      expensesLoading.set(false);
    },
    () => {
      expenses.set([]);
      expensesLoading.set(false);
    },
  );

  unsubKnownNames = onSnapshot(collection(db, 'groups', group.id, 'knownNames'), (snap) => {
    knownNames.set(
      snap.docs.map((d) => ({ name: d.id, ...(d.data() as Omit<KnownName, 'name'>) })),
    );
  });
});

export type NewExpense = Omit<Expense, 'id' | 'createdBy' | 'createdAt' | 'source'>;

export async function addExpense(groupId: string, data: NewExpense): Promise<void> {
  const user = get(currentUser);
  if (!user) throw new Error('Not signed in');
  await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    ...data,
    createdBy: user.uid,
    createdAt: Date.now(),
    source: 'manual',
  });
  await bumpKnownName(groupId, data.name);
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: Partial<NewExpense>,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'expenses', expenseId), data);
  if (data.name) await bumpKnownName(groupId, data.name);
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}

export async function bumpKnownName(groupId: string, name: string): Promise<void> {
  const key = normalizeText(name);
  if (!key) return;
  await setDoc(
    doc(db, 'groups', groupId, 'knownNames', key),
    { count: increment(1), lastUsed: Date.now(), displayName: name },
    { merge: true },
  );
}
