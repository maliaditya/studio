

"use client";

const DB_NAME_BASE = 'LifeOSFileDB';
const AUDIO_STORE_NAME = 'audioStore';
const PDF_STORE_NAME = 'pdfStore';
const BACKUP_STORE_NAME = 'backupStore';
const EXCALIDRAW_STORE_NAME = 'excalidrawFileStore';
const DB_VERSION = 4; // Incremented version
const DB_NAME_STORAGE_KEY = 'lifeos.indexeddb.name';
const EXCALIDRAW_CACHE_NAME = 'lifeos-excalidraw-cache-v1';
const EXCALIDRAW_CACHE_PREFIX = 'https://lifeos.local/excalidraw/';

export type ExcalidrawFileRecord = {
  blob: Blob;
  mimeType: string;
  created?: number;
  lastRetrieved?: number;
};

const excalidrawMemoryStore = new Map<string, ExcalidrawFileRecord>();
let excalidrawDisableIndexedDb = false;
let excalidrawDisableCache = false;
let excalidrawFallbackLogged = false;

let dbPromise: Promise<IDBDatabase> | null = null;
let dbInstance: IDBDatabase | null = null;
let activeDbName: string | null = null;
let disableIndexedDb = false;
let persistentFallbackLogged = false;

const memoryStoreByName = new Map<string, Map<string, Blob>>();

function getMemoryStore(storeName: string): Map<string, Blob> {
  let store = memoryStoreByName.get(storeName);
  if (!store) {
    store = new Map<string, Blob>();
    memoryStoreByName.set(storeName, store);
  }
  return store;
}

function getDbName(): string {
  if (activeDbName) return activeDbName;
  if (typeof window === 'undefined') {
    activeDbName = DB_NAME_BASE;
    return activeDbName;
  }
  try {
    const stored = window.localStorage.getItem(DB_NAME_STORAGE_KEY);
    activeDbName = stored?.trim() || DB_NAME_BASE;
  } catch {
    activeDbName = DB_NAME_BASE;
  }
  return activeDbName;
}

function persistDbName(name: string) {
  activeDbName = name;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DB_NAME_STORAGE_KEY, name);
  } catch {
    // ignore localStorage write errors
  }
}

function resetDbConnection() {
  try {
    dbInstance?.close();
  } catch {
    // ignore close errors
  }
  dbInstance = null;
  dbPromise = null;
}

function isRecoverableIndexedDbError(error: unknown): boolean {
  const message = String((error as any)?.message || error || "").toLowerCase();
  const name = String((error as any)?.name || "").toLowerCase();
  return (
    message.includes("internal error") ||
    message.includes("indexeddb error") ||
    message.includes("blocked") ||
    name.includes("unknownerror") ||
    name.includes("invalidstateerror") ||
    name.includes("transactioninactiveerror") ||
    name.includes("aborterror") ||
    name.includes("notfounderror") ||
    name.includes("versionerror") ||
    name.includes("datacloneerror") ||
    name.includes("quotaexceedederror") ||
    message.includes("quota")
  );
}

function describeIndexedDbError(error: unknown): string {
  const name = (error as any)?.name ? String((error as any).name) : "UnknownError";
  const message = (error as any)?.message ? String((error as any).message) : String(error || "");
  return `${name}${message ? `: ${message}` : ""}`;
}

function shouldDisablePersistentStorage(error: unknown): boolean {
  const normalized = describeIndexedDbError(error).toLowerCase();
  return normalized.includes('internal error') || normalized.includes('unknownerror');
}

function disablePersistentStorage(reason?: unknown) {
  disableIndexedDb = true;
  excalidrawDisableIndexedDb = true;
  if (!persistentFallbackLogged) {
    console.warn('[audioDB] Persistent storage unavailable; using in-memory store for this session.', reason);
    persistentFallbackLogged = true;
  }
}

function buildExcalidrawCacheRequest(key: string): Request {
  return new Request(`${EXCALIDRAW_CACHE_PREFIX}${encodeURIComponent(key)}`);
}

async function storeExcalidrawInCache(key: string, record: ExcalidrawFileRecord): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await caches.open(EXCALIDRAW_CACHE_NAME);
    const headers = new Headers();
    const mimeType = record.mimeType || record.blob.type || 'application/octet-stream';
    headers.set('Content-Type', mimeType);
    if (record.created) headers.set('x-created', String(record.created));
    if (record.lastRetrieved) headers.set('x-last-retrieved', String(record.lastRetrieved));
    const response = new Response(record.blob, { headers });
    await cache.put(buildExcalidrawCacheRequest(key), response);
    return true;
  } catch (error) {
    console.warn('[audioDB] Failed to store Excalidraw file in CacheStorage:', describeIndexedDbError(error));
    if (shouldDisablePersistentStorage(error)) {
      excalidrawDisableCache = true;
    }
    return false;
  }
}

async function getExcalidrawFromCache(key: string): Promise<ExcalidrawFileRecord | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(EXCALIDRAW_CACHE_NAME);
    const response = await cache.match(buildExcalidrawCacheRequest(key));
    if (!response) return null;
    const blob = await response.blob();
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const createdRaw = response.headers.get('x-created');
    const lastRetrievedRaw = response.headers.get('x-last-retrieved');
    const created = createdRaw ? Number(createdRaw) : undefined;
    const lastRetrieved = lastRetrievedRaw ? Number(lastRetrievedRaw) : undefined;
    return { blob, mimeType, created, lastRetrieved };
  } catch (error) {
    console.warn('[audioDB] Failed to read Excalidraw file from CacheStorage:', describeIndexedDbError(error));
    if (shouldDisablePersistentStorage(error)) {
      excalidrawDisableCache = true;
    }
    return null;
  }
}

async function rebuildDatabase(): Promise<void> {
  resetDbConnection();
  const dbName = getDbName();
  await new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = window.indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onblocked = () => reject(new Error('IndexedDB delete blocked by another tab/window.'));
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error || new Error('Failed to delete IndexedDB.'));
    };
  });
}

function rotateToFreshDatabase() {
  resetDbConnection();
  const freshName = `${DB_NAME_BASE}_${Date.now()}`;
  persistDbName(freshName);
  console.warn(`[audioDB] Switched to a fresh IndexedDB instance: ${freshName}`);
}

async function withIndexedDbRecovery<T>(
  label: string,
  operation: () => Promise<T>,
  attempt = 0
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const canRecover = isRecoverableIndexedDbError(error) && attempt < 3;
    if (!canRecover) throw error;
    console.warn(`[audioDB] ${label} failed (attempt ${attempt + 1}), recovering IndexedDB...`, error);
    if (attempt === 0) {
      resetDbConnection();
    } else if (attempt === 1) {
      try {
        await rebuildDatabase();
      } catch (rebuildError) {
        console.warn('[audioDB] Rebuild failed, rotating DB name.', rebuildError);
        rotateToFreshDatabase();
      }
    } else {
      rotateToFreshDatabase();
    }
    return withIndexedDbRecovery(label, operation, attempt + 1);
  }
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(getDbName(), DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        db.createObjectStore(BACKUP_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(EXCALIDRAW_STORE_NAME)) {
        db.createObjectStore(EXCALIDRAW_STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.onversionchange = () => {
        try {
          db.close();
        } catch {
          // ignore close errors
        }
        if (dbInstance === db) {
          dbInstance = null;
          dbPromise = null;
        }
      };
      dbInstance = db;
      resolve(db);
    };

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error('IndexedDB error:', error, describeIndexedDbError(error));
      reject(error || new Error('IndexedDB error'));
      dbPromise = null;
    };

    request.onblocked = () => {
        console.warn('IndexedDB connection is blocked. Please close other tabs with this app open.');
        reject(new Error('IndexedDB connection blocked.'));
        dbPromise = null;
    };
  });
  
  return dbPromise;
}

async function storeItem(storeName: string, key: string, blob: Blob): Promise<void> {
    if (disableIndexedDb) {
      getMemoryStore(storeName).set(key, blob);
      return;
    }
    try {
      return await withIndexedDbRecovery(`store ${storeName}/${key}`, async () => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(blob, key);

          request.onsuccess = () => resolve();
          request.onerror = (event) => {
              const error = (event.target as IDBRequest).error;
              console.error(`Error storing item in ${storeName}:`, error);
              reject(error || new Error(`Failed to store item in ${storeName}.`));
          };
          transaction.onerror = (event) => {
            const error = (event.target as IDBTransaction).error;
            reject(error || new Error(`Transaction failed in ${storeName}.`));
          };
        });
      });
    } catch (error) {
      if (shouldDisablePersistentStorage(error)) {
        disablePersistentStorage(error);
        getMemoryStore(storeName).set(key, blob);
        return;
      }
      throw error;
    }
}

async function getItem(storeName: string, key: string): Promise<Blob | null> {
    if (disableIndexedDb) {
      return getMemoryStore(storeName).get(key) || null;
    }
    try {
      return await withIndexedDbRecovery(`get ${storeName}/${key}`, async () => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve(request.result || null);
          };
          request.onerror = (event) => {
            const error = (event.target as IDBRequest).error;
            console.error(`Error fetching item from ${storeName}:`, error);
            reject(error || new Error(`Failed to retrieve item from ${storeName}.`));
          };
          transaction.onerror = (event) => {
            const error = (event.target as IDBTransaction).error;
            reject(error || new Error(`Transaction failed in ${storeName}.`));
          };
        });
      });
    } catch (error) {
      if (shouldDisablePersistentStorage(error)) {
        disablePersistentStorage(error);
        return getMemoryStore(storeName).get(key) || null;
      }
      throw error;
    }
}

async function deleteItem(storeName: string, key: string): Promise<void> {
    if (disableIndexedDb) {
      getMemoryStore(storeName).delete(key);
      return;
    }
    try {
      return await withIndexedDbRecovery(`delete ${storeName}/${key}`, async () => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => {
                const error = (event.target as IDBRequest).error;
                console.error(`Error deleting item from ${storeName}:`, error);
                reject(error || new Error(`Failed to delete item from ${storeName}.`));
            };
            transaction.onerror = (event) => {
              const error = (event.target as IDBTransaction).error;
              reject(error || new Error(`Transaction failed in ${storeName}.`));
            };
        });
      });
    } catch (error) {
      if (shouldDisablePersistentStorage(error)) {
        disablePersistentStorage(error);
        getMemoryStore(storeName).delete(key);
        return;
      }
      throw error;
    }
}

async function getAllKeys(storeName: string): Promise<string[]> {
  if (disableIndexedDb) {
    return Array.from(getMemoryStore(storeName).keys());
  }
  try {
    return await withIndexedDbRecovery(`getAllKeys ${storeName}`, async () => {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve((request.result || []) as string[]);
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error fetching keys from ${storeName}:`, error);
          reject(error || new Error(`Failed to retrieve keys from ${storeName}.`));
        };
        transaction.onerror = (event) => {
          const error = (event.target as IDBTransaction).error;
          reject(error || new Error(`Transaction failed in ${storeName}.`));
        };
      });
    });
  } catch (error) {
    if (shouldDisablePersistentStorage(error)) {
      disablePersistentStorage(error);
      return Array.from(getMemoryStore(storeName).keys());
    }
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
    if (disableIndexedDb) {
      memoryStoreByName.forEach(store => store.clear());
      return;
    }
    try {
      return await withIndexedDbRecovery("clearAllData", async () => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const storesToClear = [AUDIO_STORE_NAME, PDF_STORE_NAME, BACKUP_STORE_NAME, EXCALIDRAW_STORE_NAME];
          if (storesToClear.every(store => !db.objectStoreNames.contains(store))) {
            console.log('No object stores found to clear.');
            resolve();
            return;
          }

          const transaction = db.transaction(storesToClear, 'readwrite');

          transaction.oncomplete = () => {
            console.log('All IndexedDB object stores have been cleared.');
            resolve();
          };

          transaction.onerror = (event) => {
            const error = (event.target as IDBTransaction).error;
            console.error('Error clearing IndexedDB:', error);
            reject(error || new Error('Failed to clear IndexedDB.'));
          };

          storesToClear.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
                const store = transaction.objectStore(storeName);
                store.clear();
            }
          });
        });
      });
    } catch (error) {
      if (shouldDisablePersistentStorage(error)) {
        disablePersistentStorage(error);
        memoryStoreByName.forEach(store => store.clear());
        return;
      }
      throw error;
    }
}


// Audio functions
export const storeAudio = (key: string, audioBlob: Blob) => storeItem(AUDIO_STORE_NAME, key, audioBlob);
export const getAudio = (key: string) => getItem(AUDIO_STORE_NAME, key);
export const deleteAudio = (key: string) => deleteItem(AUDIO_STORE_NAME, key);
export const getAllAudioKeys = () => getAllKeys(AUDIO_STORE_NAME);

// Try a set of likely key variants for a resource (id, filename, filename without ext,
// variants with underscores/spaces and trimmed quotes) and return the first found blob and key.
export async function getAudioForResource(id?: string, audioFileName?: string): Promise<{ blob: Blob | null; key?: string }> {
  const candidates = new Set<string>();
  if (id) candidates.add(id);
  if (audioFileName) candidates.add(audioFileName);

  const normalize = (s: string) => s?.trim();

  const addVariants = (s?: string) => {
    if (!s) return;
    let v = normalize(s);
    candidates.add(v);
    // strip surrounding quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      candidates.add(v.slice(1, -1));
      v = v.slice(1, -1);
    }
    // without extension
    const dotIndex = v.lastIndexOf('.');
    if (dotIndex > 0) candidates.add(v.slice(0, dotIndex));
    // with underscores/spaces swapped
    candidates.add(v.replace(/\s+/g, '_'));
    candidates.add(v.replace(/_/g, ' '));
    // url decoded
    try {
      candidates.add(decodeURIComponent(v));
    } catch (e) {}
    // lowercase variant
    candidates.add(v.toLowerCase());
    // collapse multiple spaces
    candidates.add(v.replace(/\s+/g, ' '));
    // remove hash/pound signs and collapse
    candidates.add(v.replace(/#/g, ''));
    // remove punctuation except dots, spaces, underscores, hyphens
    candidates.add(v.replace(/[^\w.\s\-_]/g, ''));
    // replace any non-word with underscore, collapse underscores
    candidates.add(v.replace(/[^\w]/g, '_').replace(/_+/g, '_'));
    // try without parentheses content
    candidates.add(v.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim());
    // try common audio extensions if missing
    if (!/\.[a-zA-Z0-9]{1,4}$/.test(v)) {
      ['mp3','m4a','wav','aac','ogg'].forEach(ext => candidates.add(`${v}.${ext}`));
    }
  };

  addVariants(audioFileName);
  // also try id variants
  if (id) addVariants(id);

  const normalizeForMatch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/#[^\s]+/g, ' ')
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  };

  // Expand with normalized variants that are common mismatch cases.
  const expanded = new Set<string>();
  const addSlugVariants = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    // remove bracketed and parenthetical content
    const withoutBrackets = trimmed.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
    // remove hashtags
    const withoutHash = withoutBrackets.replace(/#[^\s]+/g, ' ');
    const slug = withoutHash
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (slug) {
      expanded.add(slug);
      expanded.add(slug.toLowerCase());
    }
  };
  for (const c of candidates) {
    if (!c) continue;
    const trimmed = c.trim();
    if (!trimmed) continue;
    expanded.add(trimmed);
    expanded.add(trimmed.replace(/\s+/g, ' '));
    const noExt = trimmed.replace(/\.[a-zA-Z0-9]{1,5}$/, '');
    expanded.add(noExt);
    expanded.add(noExt.replace(/\s+/g, ' '));
    addSlugVariants(trimmed);
    addSlugVariants(noExt);
  }

  const tryList = Array.from(expanded).filter(Boolean);
  // prefer longer more specific keys first
  tryList.sort((a, b) => b.length - a.length);
  console.debug('getAudioForResource: trying keys', tryList);
  for (const k of tryList) {
    try {
      const b = await getItem(AUDIO_STORE_NAME, k);
      if (b) return { blob: b, key: k };
    } catch (e) {
      // ignore
    }
  }
  // Fallback: compare normalized slugs against existing keys in the store
  try {
    const keys = await getAllAudioKeys();
    const targetNorms = new Set<string>();
    if (audioFileName) targetNorms.add(normalizeForMatch(audioFileName));
    if (id) targetNorms.add(normalizeForMatch(id));
    for (const key of keys) {
      const keyNorm = normalizeForMatch(key);
      if (targetNorms.has(keyNorm) && keyNorm.length > 0) {
        const b = await getItem(AUDIO_STORE_NAME, key);
        if (b) return { blob: b, key };
      }
    }
  } catch (e) {
    // ignore fallback errors
  }
  console.debug('getAudioForResource: no key matched for', id, audioFileName);
  return { blob: null };
}

// PDF functions
export const storePdf = (key: string, pdfBlob: Blob) => storeItem(PDF_STORE_NAME, key, pdfBlob);
export const getPdf = (key: string) => getItem(PDF_STORE_NAME, key);
export const deletePdf = (key: string) => deleteItem(PDF_STORE_NAME, key);
export const getAllPdfKeys = () => getAllKeys(PDF_STORE_NAME);

// Resolve PDF blob using robust key matching across id/filename variants.
export async function getPdfForResource(id?: string, pdfFileName?: string): Promise<{ blob: Blob | null; key?: string }> {
  const candidates = new Set<string>();
  if (id) candidates.add(id);
  if (pdfFileName) candidates.add(pdfFileName);

  const normalize = (s: string) => s?.trim();

  const addVariants = (s?: string) => {
    if (!s) return;
    let v = normalize(s);
    candidates.add(v);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      candidates.add(v.slice(1, -1));
      v = v.slice(1, -1);
    }
    const dotIndex = v.lastIndexOf('.');
    if (dotIndex > 0) candidates.add(v.slice(0, dotIndex));
    candidates.add(v.replace(/\s+/g, '_'));
    candidates.add(v.replace(/_/g, ' '));
    try {
      candidates.add(decodeURIComponent(v));
    } catch (e) {}
    candidates.add(v.toLowerCase());
    candidates.add(v.replace(/\s+/g, ' '));
    candidates.add(v.replace(/#/g, ''));
    candidates.add(v.replace(/[^\w.\s\-_]/g, ''));
    candidates.add(v.replace(/[^\w]/g, '_').replace(/_+/g, '_'));
    candidates.add(v.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim());
    if (!/\.[a-zA-Z0-9]{1,4}$/.test(v)) {
      ['pdf', 'epub'].forEach(ext => candidates.add(`${v}.${ext}`));
    }
  };

  addVariants(pdfFileName);
  if (id) addVariants(id);

  const normalizeForMatch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/#[^\s]+/g, ' ')
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  };

  const expanded = new Set<string>();
  const addSlugVariants = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const withoutBrackets = trimmed.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
    const withoutHash = withoutBrackets.replace(/#[^\s]+/g, ' ');
    const slug = withoutHash
      .replace(/[^\w]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (slug) {
      expanded.add(slug);
      expanded.add(slug.toLowerCase());
    }
  };
  for (const c of candidates) {
    if (!c) continue;
    const trimmed = c.trim();
    if (!trimmed) continue;
    expanded.add(trimmed);
    expanded.add(trimmed.replace(/\s+/g, ' '));
    const noExt = trimmed.replace(/\.[a-zA-Z0-9]{1,5}$/, '');
    expanded.add(noExt);
    expanded.add(noExt.replace(/\s+/g, ' '));
    addSlugVariants(trimmed);
    addSlugVariants(noExt);
  }

  const tryList = Array.from(expanded).filter(Boolean);
  tryList.sort((a, b) => b.length - a.length);
  console.debug('getPdfForResource: trying keys', tryList);
  for (const k of tryList) {
    try {
      const b = await getItem(PDF_STORE_NAME, k);
      if (b) return { blob: b, key: k };
    } catch (e) {
      // ignore
    }
  }

  try {
    const keys = await getAllPdfKeys();
    const targetNorms = new Set<string>();
    if (pdfFileName) targetNorms.add(normalizeForMatch(pdfFileName));
    if (id) targetNorms.add(normalizeForMatch(id));
    for (const key of keys) {
      const keyNorm = normalizeForMatch(key);
      if (targetNorms.has(keyNorm) && keyNorm.length > 0) {
        const b = await getItem(PDF_STORE_NAME, key);
        if (b) return { blob: b, key };
      }
    }
  } catch (e) {
    // ignore fallback errors
  }

  console.debug('getPdfForResource: no key matched for', id, pdfFileName);
  return { blob: null };
}

// Backup functions
export const storeBackup = (key: string, backupBlob: Blob) => storeItem(BACKUP_STORE_NAME, key, backupBlob);
export const getBackup = (key: string) => getItem(BACKUP_STORE_NAME, key);
export const deleteBackup = (key: string) => deleteItem(BACKUP_STORE_NAME, key);

// Excalidraw file functions
export async function storeExcalidrawFile(key: string, record: ExcalidrawFileRecord): Promise<void> {
  if (excalidrawDisableIndexedDb && excalidrawDisableCache) {
    excalidrawMemoryStore.set(key, record);
    if (!excalidrawFallbackLogged) {
      console.warn('[audioDB] Falling back to in-memory store for Excalidraw files (persistent storage unavailable).');
      excalidrawFallbackLogged = true;
    }
    return;
  }
  if (excalidrawDisableIndexedDb) {
    const cached = excalidrawDisableCache ? false : await storeExcalidrawInCache(key, record);
    if (cached) {
      console.warn(`[audioDB] IndexedDB unavailable; stored Excalidraw file in CacheStorage for ${key}.`);
      return;
    }
    excalidrawMemoryStore.set(key, record);
    if (!excalidrawFallbackLogged) {
      console.warn('[audioDB] Falling back to in-memory store for Excalidraw files (persistent storage unavailable).');
      excalidrawFallbackLogged = true;
    }
    return;
  }
  try {
    await withIndexedDbRecovery(`store excalidraw/${key}`, async () => {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(EXCALIDRAW_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(EXCALIDRAW_STORE_NAME);
        const request = store.put(record, key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error(`Error storing Excalidraw file:`, (event.target as IDBRequest).error);
          reject(new Error(`Failed to store Excalidraw file.`));
        };
        transaction.onerror = (event) => {
          const error = (event.target as IDBTransaction).error;
          reject(error || new Error(`Failed to store Excalidraw file.`));
        };
        transaction.onabort = (event) => {
          const error = (event.target as IDBTransaction).error;
          reject(error || new Error(`Failed to store Excalidraw file (aborted).`));
        };
      });
    });
    return;
  } catch (error) {
    if (shouldDisablePersistentStorage(error)) {
      excalidrawDisableIndexedDb = true;
    }
    const cached = excalidrawDisableCache ? false : await storeExcalidrawInCache(key, record);
    if (cached) {
      console.warn(`[audioDB] IndexedDB unavailable; stored Excalidraw file in CacheStorage for ${key}.`);
      return;
    }
    excalidrawMemoryStore.set(key, record);
    if (!excalidrawFallbackLogged) {
      console.warn('[audioDB] Falling back to in-memory store for Excalidraw files (persistent storage unavailable).');
      excalidrawFallbackLogged = true;
    }
    return;
  }
}

export async function getExcalidrawFile(key: string): Promise<ExcalidrawFileRecord | null> {
  const memoryRecord = excalidrawMemoryStore.get(key);
  if (memoryRecord) return memoryRecord;
  try {
    if (!excalidrawDisableIndexedDb) {
      const record = await withIndexedDbRecovery(`get excalidraw/${key}`, async () => {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(EXCALIDRAW_STORE_NAME, 'readonly');
          const store = transaction.objectStore(EXCALIDRAW_STORE_NAME);
          const request = store.get(key);

          request.onsuccess = () => resolve(request.result || null);
          request.onerror = (event) => {
            console.error(`Error fetching Excalidraw file:`, (event.target as IDBRequest).error);
            reject(new Error(`Failed to retrieve Excalidraw file.`));
          };
          transaction.onerror = (event) => {
            const error = (event.target as IDBTransaction).error;
            reject(error || new Error(`Failed to retrieve Excalidraw file.`));
          };
        });
      });
      if (record) return record as ExcalidrawFileRecord;
    }
  } catch (error) {
    if (shouldDisablePersistentStorage(error)) {
      excalidrawDisableIndexedDb = true;
    }
    console.warn(`[audioDB] IndexedDB failed for get excalidraw/${key}:`, describeIndexedDbError(error));
  }
  if (excalidrawDisableCache) return excalidrawMemoryStore.get(key) || null;
  return await getExcalidrawFromCache(key);
}

export const deleteExcalidrawFile = (key: string) => {
  excalidrawMemoryStore.delete(key);
  if (excalidrawDisableIndexedDb) return Promise.resolve();
  return withIndexedDbRecovery(`delete excalidraw/${key}`, () => deleteItem(EXCALIDRAW_STORE_NAME, key));
};

export async function getAllExcalidrawFiles(): Promise<{ key: string; record: ExcalidrawFileRecord }[]> {
  if (excalidrawDisableIndexedDb) {
    return Array.from(excalidrawMemoryStore.entries()).map(([key, record]) => ({ key, record }));
  }
  return withIndexedDbRecovery(`list excalidraw`, async () => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(EXCALIDRAW_STORE_NAME, 'readonly');
      const store = transaction.objectStore(EXCALIDRAW_STORE_NAME);
      const getAllKeysRequest = store.getAllKeys();
      const getAllRequest = store.getAll();

      let keys: IDBValidKey[] = [];
      let records: ExcalidrawFileRecord[] = [];

      const maybeResolve = () => {
        if (keys.length === 0 && records.length === 0) return;
        if (keys.length && records.length && keys.length === records.length) {
          resolve(keys.map((key, index) => ({ key: String(key), record: records[index] })));
        }
      };

      getAllKeysRequest.onsuccess = () => {
        keys = (getAllKeysRequest.result || []) as IDBValidKey[];
        if (keys.length === 0) {
          resolve([]);
          return;
        }
        maybeResolve();
      };
      getAllKeysRequest.onerror = (event) => {
        console.error(`Error fetching Excalidraw file keys:`, (event.target as IDBRequest).error);
        reject(new Error(`Failed to retrieve Excalidraw file keys.`));
      };

      getAllRequest.onsuccess = () => {
        records = (getAllRequest.result || []) as ExcalidrawFileRecord[];
        if (records.length === 0) {
          resolve([]);
          return;
        }
        maybeResolve();
      };
      getAllRequest.onerror = (event) => {
        console.error(`Error fetching Excalidraw files:`, (event.target as IDBRequest).error);
        reject(new Error(`Failed to retrieve Excalidraw files.`));
      };
      transaction.onerror = (event) => {
        const error = (event.target as IDBTransaction).error;
        reject(error || new Error(`Failed to retrieve Excalidraw files.`));
      };
    });
  });
}
