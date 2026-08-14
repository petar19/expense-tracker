import { writable } from 'svelte/store';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Category } from '../types';

export const categories = writable<Category[]>([]);
export const categoriesLoading = writable(true);

onSnapshot(
  collection(db, 'categories'),
  (snap) => {
    categories.set(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    categoriesLoading.set(false);
  },
  () => categoriesLoading.set(false),
);

export async function createCategory(name: string, keywords: string[] = []): Promise<string> {
  const ref = await addDoc(collection(db, 'categories'), { name, keywords });
  return ref.id;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'categories', id), { name });
}

export async function setCategoryKeywords(id: string, keywords: string[]): Promise<void> {
  await updateDoc(doc(db, 'categories', id), { keywords });
}

export async function addKeywordToCategory(id: string, keyword: string): Promise<void> {
  await updateDoc(doc(db, 'categories', id), { keywords: arrayUnion(keyword) });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id));
}
