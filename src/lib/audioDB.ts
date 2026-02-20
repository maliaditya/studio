

"use client";

const DB_NAME = 'LifeOSFileDB';
const AUDIO_STORE_NAME = 'audioStore';
const PDF_STORE_NAME = 'pdfStore';
const BACKUP_STORE_NAME = 'backupStore';
const EXCALIDRAW_STORE_NAME = 'excalidrawFileStore';
const DB_VERSION = 4; // Incremented version

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('IndexedDB error'));
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
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(blob, key);
  
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
          console.error(`Error storing item in ${storeName}:`, (event.target as IDBRequest).error);
          reject(new Error(`Failed to store item in ${storeName}.`));
      };
    });
}

async function getItem(storeName: string, key: string): Promise<Blob | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
  
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = (event) => {
        console.error(`Error fetching item from ${storeName}:`, (event.target as IDBRequest).error);
        reject(new Error(`Failed to retrieve item from ${storeName}.`));
      };
    });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
    
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Error deleting item from ${storeName}:`, (event.target as IDBRequest).error);
            reject(new Error(`Failed to delete item from ${storeName}.`));
        };
    });
}

async function getAllKeys(storeName: string): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve((request.result || []) as string[]);
    request.onerror = (event) => {
      console.error(`Error fetching keys from ${storeName}:`, (event.target as IDBRequest).error);
      reject(new Error(`Failed to retrieve keys from ${storeName}.`));
    };
  });
}

export async function clearAllData(): Promise<void> {
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
        console.error('Error clearing IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Failed to clear IndexedDB.'));
      };
  
      storesToClear.forEach(storeName => {
        if (db.objectStoreNames.contains(storeName)) {
            const store = transaction.objectStore(storeName);
            store.clear();
        }
      });
    });
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
export type ExcalidrawFileRecord = {
  blob: Blob;
  mimeType: string;
  created?: number;
  lastRetrieved?: number;
};

export async function storeExcalidrawFile(key: string, record: ExcalidrawFileRecord): Promise<void> {
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
  });
}

export async function getExcalidrawFile(key: string): Promise<ExcalidrawFileRecord | null> {
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
  });
}

export const deleteExcalidrawFile = (key: string) => deleteItem(EXCALIDRAW_STORE_NAME, key);

export async function getAllExcalidrawFiles(): Promise<{ key: string; record: ExcalidrawFileRecord }[]> {
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
  });
}
