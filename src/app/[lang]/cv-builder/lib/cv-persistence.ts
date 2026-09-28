import type { CVDraft } from '../types';
import { normalizeDraft } from './cv-utils';

const DB_NAME = 'aria-hub-cv-builder';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const ACTIVE_KEY = 'aria-hub-cv-active-v3';
const SNAPSHOT_KEY = 'aria-hub-cv-active-snapshot-v3';
const FALLBACK_KEY = 'aria-hub-cv-drafts-fallback-v3';

function browserReady() {
  return typeof window !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!browserReady() || !('indexedDB' in window)) return reject(new Error('indexeddb-unavailable'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('indexeddb-open-failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error || new Error('indexeddb-request-failed'));
    request.onsuccess = () => resolve(request.result);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('indexeddb-transaction-failed'));
    };
  });
}

function readFallback(): CVDraft[] {
  if (!browserReady()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeDraft).filter(Boolean) as CVDraft[] : [];
  } catch {
    return [];
  }
}

function writeFallback(drafts: CVDraft[]) {
  if (!browserReady()) return;
  try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(drafts)); } catch {}
}

export async function loadDrafts(): Promise<CVDraft[]> {
  let drafts: CVDraft[] = [];
  try {
    const raw = await withStore<any[]>('readonly', (store) => store.getAll());
    drafts = (raw || []).map(normalizeDraft).filter(Boolean) as CVDraft[];
  } catch {
    drafts = readFallback();
  }

  const snapshot = readSynchronousSnapshot();
  if (snapshot) {
    const index = drafts.findIndex((draft) => draft.id === snapshot.id);
    if (index === -1) drafts.push(snapshot);
    else if (snapshot.updatedAt > drafts[index].updatedAt) drafts[index] = snapshot;
  }

  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveDraft(draft: CVDraft): Promise<void> {
  const normalized = normalizeDraft(draft);
  if (!normalized) throw new Error('invalid-draft');
  try {
    await withStore<IDBValidKey>('readwrite', (store) => store.put(normalized));
  } catch {
    const existing = readFallback().filter((item) => item.id !== normalized.id);
    writeFallback([normalized, ...existing].slice(0, 20));
  }
  writeSynchronousSnapshot(normalized);
}

export async function deleteDraft(id: string): Promise<void> {
  try { await withStore('readwrite', (store) => store.delete(id)); }
  catch { writeFallback(readFallback().filter((item) => item.id !== id)); }
}

export function readActiveDraftId(): string | null {
  return browserReady() ? localStorage.getItem(ACTIVE_KEY) : null;
}

export function writeActiveDraftId(id: string) {
  if (browserReady()) localStorage.setItem(ACTIVE_KEY, id);
}

export function writeSynchronousSnapshot(draft: CVDraft) {
  if (!browserReady()) return;
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(draft)); } catch {}
}

export function readSynchronousSnapshot(): CVDraft | null {
  if (!browserReady()) return null;
  try { return normalizeDraft(JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null')); }
  catch { return null; }
}
