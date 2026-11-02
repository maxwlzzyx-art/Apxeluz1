import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Item, Category, WebsiteSettings } from '../types/admin';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ITEMS_COLLECTION = 'items';
export const CATEGORIES_COLLECTION = 'categories';
export const SETTINGS_COLLECTION = 'settings';

/**
 * Real-time listener for public visitors.
 * Subscribes to published items dynamically without requiring user authentication or redeployments.
 */
export function subscribeToPublishedItems(
  onSuccess: (items: Item[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const q = query(collection(db, ITEMS_COLLECTION), where('visibility', '==', 'published'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Item;
        items.push({ ...data, id: d.id });
      });
      // Sort in memory by updatedDate / releaseDate descending
      items.sort((a, b) => {
        const timeA = new Date(a.updatedDate || a.releaseDate || 0).getTime();
        const timeB = new Date(b.updatedDate || b.releaseDate || 0).getTime();
        return timeB - timeA;
      });
      onSuccess(items);
    },
    (error) => {
      console.warn('Real-time published items listener notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for administrator to view all repository items (both published and drafts).
 */
export function subscribeToAllAdminItems(
  onSuccess: (items: Item[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const q = collection(db, ITEMS_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Item[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Item;
        items.push({ ...data, id: d.id });
      });
      items.sort((a, b) => {
        const timeA = new Date(a.updatedDate || a.releaseDate || 0).getTime();
        const timeB = new Date(b.updatedDate || b.releaseDate || 0).getTime();
        return timeB - timeA;
      });
      onSuccess(items);
    },
    (error) => {
      console.warn('Admin items listener notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for categories.
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, CATEGORIES_COLLECTION),
    (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach((d) => {
        categories.push({ ...(d.data() as Category), id: d.id });
      });
      categories.sort((a, b) => (a.order || 0) - (b.order || 0));
      onSuccess(categories);
    },
    (error) => {
      console.warn('Categories listener notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for website settings.
 */
export function subscribeToSettings(
  onSuccess: (settings: WebsiteSettings | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const settingsDocRef = doc(db, SETTINGS_COLLECTION, 'general');
  return onSnapshot(
    settingsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onSuccess(snapshot.data() as WebsiteSettings);
      } else {
        onSuccess(null);
      }
    },
    (error) => {
      console.warn('Settings listener notice:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves or updates an item in Cloud Firestore permanently.
 */
export async function saveItemToFirestore(item: Item): Promise<void> {
  const itemDocRef = doc(db, ITEMS_COLLECTION, item.id);
  try {
    await setDoc(
      itemDocRef,
      {
        ...item,
        updatedDate: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ITEMS_COLLECTION}/${item.id}`);
  }
}

/**
 * Permanently deletes an item from Cloud Firestore.
 */
export async function deleteItemFromFirestore(itemId: string): Promise<void> {
  const itemDocRef = doc(db, ITEMS_COLLECTION, itemId);
  try {
    await deleteDoc(itemDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ITEMS_COLLECTION}/${itemId}`);
  }
}

/**
 * Atomically toggles item publication status.
 */
export async function toggleItemVisibilityInFirestore(
  itemId: string,
  newVisibility: 'published' | 'draft'
): Promise<void> {
  const itemDocRef = doc(db, ITEMS_COLLECTION, itemId);
  try {
    await updateDoc(itemDocRef, {
      visibility: newVisibility,
      updatedDate: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ITEMS_COLLECTION}/${itemId}`);
  }
}

/**
 * Atomically increments the download counter in Firestore when a visitor downloads an application.
 */
export async function incrementDownloadCounter(itemId: string): Promise<void> {
  if (!itemId) return;
  const itemDocRef = doc(db, ITEMS_COLLECTION, itemId);
  try {
    await updateDoc(itemDocRef, {
      downloadCount: increment(1),
    });
  } catch (err) {
    console.warn('Failed to increment download counter (non-fatal):', err);
  }
}

/**
 * Saves a category to Firestore.
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const catDocRef = doc(db, CATEGORIES_COLLECTION, category.id);
  try {
    await setDoc(catDocRef, category, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CATEGORIES_COLLECTION}/${category.id}`);
  }
}

/**
 * Deletes a category from Firestore.
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  const catDocRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  try {
    await deleteDoc(catDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COLLECTION}/${categoryId}`);
  }
}

/**
 * Saves website settings in Firestore.
 */
export async function saveSettingsToFirestore(settings: WebsiteSettings): Promise<void> {
  const settingsDocRef = doc(db, SETTINGS_COLLECTION, 'general');
  try {
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/general`);
  }
}
