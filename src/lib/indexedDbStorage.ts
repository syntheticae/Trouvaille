// ======================================================================
// TROUVAILLE INDEXEDDB ASYNC VAULT STORAGE ENGINE
// High-performance, off-main-thread persistent snapshot cache
// Zero npm dependencies - Pure HTML5 IndexedDB API with localStorage fallback
// ======================================================================

const DB_NAME = "trouvaille_vault_db";
const DB_VERSION = 1;
const STORE_NAME = "vault_snapshots";

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase | null> | null = null;

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn("[IndexedDbStorage] IndexedDB open error, falling back to localStorage:", err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn("[IndexedDbStorage] Database open blocked.");
        resolve(null);
      };
    } catch (e) {
      console.warn("[IndexedDbStorage] Failed to initialize IndexedDB:", e);
      resolve(null);
    }
  });

  return dbOpenPromise;
}

/**
 * Asynchronously read an item from IndexedDB with transparent localStorage fallback.
 */
export async function getVaultItem<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    if (!db) {
      // Fallback to localStorage
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            resolve(req.result as T);
          } else {
            // Fallback to localStorage for existing cached data migration
            try {
              const raw = localStorage.getItem(key);
              resolve(raw ? JSON.parse(raw) : null);
            } catch {
              resolve(null);
            }
          }
        };

        req.onerror = () => {
          try {
            const raw = localStorage.getItem(key);
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        };
      } catch (txErr) {
        console.warn("[IndexedDbStorage] Transaction read error:", txErr);
        try {
          const raw = localStorage.getItem(key);
          resolve(raw ? JSON.parse(raw) : null);
        } catch {
          resolve(null);
        }
      }
    });
  } catch (err) {
    console.warn("[IndexedDbStorage] getVaultItem exception:", err);
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Asynchronously write an item to IndexedDB off-main-thread with zero 5MB quota restrictions.
 */
export async function setVaultItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      // Fallback: Cap at reasonable size for localStorage quota
      try {
        const payload = Array.isArray(value) ? value.slice(0, 500) : value;
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {}
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(value, key);

        tx.oncomplete = () => {
          resolve();
        };

        tx.onerror = (e) => {
          console.warn("[IndexedDbStorage] Transaction write error:", e);
          resolve();
        };
      } catch (txErr) {
        console.warn("[IndexedDbStorage] setVaultItem transaction error:", txErr);
        resolve();
      }
    });
  } catch (err) {
    console.warn("[IndexedDbStorage] setVaultItem exception:", err);
  }
}

/**
 * Delete an item from IndexedDB.
 */
export async function removeVaultItem(key: string): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
    }
  } catch {}

  try {
    localStorage.removeItem(key);
  } catch {}
}
