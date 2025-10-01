
"use client";

const DB_NAME = 'LifeOSFileDB';
const AUDIO_STORE_NAME = 'audioStore';
const PDF_STORE_NAME = 'pdfStore';
const DB_VERSION = 2;

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

export async function clearAllData(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const storesToClear = [AUDIO_STORE_NAME, PDF_STORE_NAME];
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

// PDF functions
export const storePdf = (key: string, pdfBlob: Blob) => storeItem(PDF_STORE_NAME, key, pdfBlob);
export const getPdf = (key: string) => getItem(PDF_STORE_NAME, key);
export const deletePdf = (key: string) => deleteItem(PDF_STORE_NAME, key);
