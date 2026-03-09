/**
 * Persistence service using IndexedDB to store large amounts of data (like Base64 images)
 * that exceed the 5MB limit of localStorage.
 */

const DB_NAME = 'BatchlyoDB';
const STORE_NAME = 'pins';
const DB_VERSION = 1;

export const persistenceService = {
  db: null as IDBDatabase | null,

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db!);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject('Failed to open IndexedDB');
      };
    });
  },

  async savePins(pins: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Store all pins under a single key 'current_pins' for simplicity, 
      // similar to how they were in localStorage.
      const request = store.put(pins, 'current_pins');

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to save pins to IndexedDB');
    });
  },

  async loadPins(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_pins');

      request.onsuccess = (event: any) => {
        resolve(event.target.result || []);
      };
      request.onerror = () => reject('Failed to load pins from IndexedDB');
    });
  },

  async clearPins(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current_pins');

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to clear pins from IndexedDB');
    });
  }
};
