"use client";

const DB_NAME = 'LifeOSAudioDB';
const STORE_NAME = 'audioStore';
const DB_VERSION = 1;

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('IndexedDB error'));
      dbPromise = null; // Reset promise on error
    };

    request.onblocked = () => {
        // This event is fired when the database is blocked by an old connection.
        console.warn('IndexedDB connection is blocked. Please close other tabs with this app open.');
        reject(new Error('IndexedDB connection blocked.'));
        dbPromise = null;
    };
  });
  
  return dbPromise;
}

export async function storeAudio(key: string, audioBlob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(audioBlob, key);

    request.onsuccess = () => resolve();
    request.onerror = (event) => {
        console.error('Error storing audio:', (event.target as IDBRequest).error);
        reject(new Error('Failed to store audio.'));
    };
  });
}

export async function getAudio(key: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = (event) => {
      console.error('Error fetching audio:', (event.target as IDBRequest).error);
      reject(new Error('Failed to retrieve audio.'));
    };
  });
}

export async function deleteAudio(key: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
  
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error('Error deleting audio:', (event.target as IDBRequest).error);
        reject(new Error('Failed to delete audio.'));
      };
    });
}