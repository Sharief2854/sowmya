/**
 * High-performance Persistent Storage for LeadFilter Pro.
 * Combines IndexedDB (for 10,000+ rows) with LocalStorage (for fast metadata).
 */

const DB_NAME = 'LeadFilterProDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'working_session';
const META_KEY = 'leadfilter_session_meta';

let cachedDbPromise = null;

function openDB() {
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    let isDone = false;
    const timeoutTimer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        cachedDbPromise = null;
        console.warn('[Storage] IndexedDB open timed out after 3000ms');
        reject(new Error('IndexedDB open timed out'));
      }
    }, 3000);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (e) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeoutTimer);
          const db = e.target.result;

          db.onversionchange = () => {
            db.close();
            cachedDbPromise = null;
          };
          db.onclose = () => {
            cachedDbPromise = null;
          };

          resolve(db);
        }
      };

      request.onerror = (e) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeoutTimer);
          cachedDbPromise = null;
          console.error('[Storage] IndexedDB open error:', e.target.error);
          reject(e.target.error);
        }
      };

      request.onblocked = () => {
        console.warn('[Storage] IndexedDB open blocked by another tab/window');
      };
    } catch (err) {
      if (!isDone) {
        isDone = true;
        clearTimeout(timeoutTimer);
        cachedDbPromise = null;
        console.error('[Storage] IndexedDB open exception:', err);
        reject(err);
      }
    }
  });

  return cachedDbPromise;
}

export async function saveWorkingSession(sessionData) {
  try {
    const rowCount = (sessionData.rawData && sessionData.rawData.length) || 0;

    // 1. Save metadata to localStorage for instant reference & fast recovery
    const meta = {
      activeFilePath: sessionData.activeFilePath || '',
      fileName: sessionData.fileName || '',
      fileSize: sessionData.fileSize || '',
      fileFormat: sessionData.fileFormat || 'csv',
      customColumns: sessionData.customColumns || [],
      hasStatusColumn: Boolean(sessionData.hasStatusColumn),
      selectedStatus: sessionData.selectedStatus || 'ALL',
      selectedPosition: sessionData.selectedPosition || 'ALL',
      lastSavedTime: sessionData.lastSavedTime || null,
      rowCount: rowCount,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      console.warn('[Storage] LocalStorage meta save error:', e);
    }

    if (rowCount === 0) {
      return true;
    }

    // 2. Clone/sanitize sessionData so IndexedDB structured clone never fails
    const cleanPayload = {
      activeFilePath: sessionData.activeFilePath || '',
      fileName: sessionData.fileName || '',
      fileSize: sessionData.fileSize || '',
      fileFormat: sessionData.fileFormat || 'csv',
      customColumns: Array.isArray(sessionData.customColumns) ? sessionData.customColumns.map(c => ({ id: c.id, name: c.name })) : [],
      hasStatusColumn: Boolean(sessionData.hasStatusColumn),
      selectedStatus: sessionData.selectedStatus || 'ALL',
      selectedPosition: sessionData.selectedPosition || 'ALL',
      lastSavedTime: sessionData.lastSavedTime || null,
      rawData: sessionData.rawData
    };

    // 1. If in Desktop Electron, save directly to local disk session file FIRST for maximum speed and safety
    if (typeof window !== 'undefined' && window.electronAPI?.saveSessionDisk) {
      try {
        const diskRes = await window.electronAPI.saveSessionDisk(cleanPayload);
        console.log(`[Storage] Synced ${cleanPayload.rawData?.length || 0} rows to desktop disk backup file. Result:`, diskRes);
      } catch (e) {
        console.warn('[Storage] Electron disk session backup error:', e);
      }
    }

    // 2. Save full payload (including 10,000+ rows) in IndexedDB
    const db = await openDB();
    const idbResult = await new Promise((resolve) => {
      let isSettled = false;
      const saveTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn('[Storage] IndexedDB put operation timed out after 4000ms');
          resolve(false);
        }
      }, 4000);

      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(cleanPayload, 'current_session');

        req.onsuccess = () => {};

        tx.oncomplete = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(saveTimer);
            console.log(`[Storage] Saved session to IndexedDB: ${meta.fileName} (${meta.rowCount} rows)`);
            resolve(true);
          }
        };

        tx.onerror = (e) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(saveTimer);
            console.error('[Storage] IndexedDB put error:', e.target.error);
            resolve(false);
          }
        };

        tx.onabort = (e) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(saveTimer);
            console.warn('[Storage] IndexedDB tx aborted:', e);
            resolve(false);
          }
        };
      } catch (putErr) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(saveTimer);
          console.error('[Storage] IndexedDB put exception:', putErr);
          resolve(false);
        }
      }
    });

    return true;
  } catch (err) {
    console.error('[Storage] Failed to save working session:', err);
    return false;
  }
}

export function getSessionMetadata() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function loadWorkingSession() {
  // 1. Try Desktop disk session first if available in Electron
  if (typeof window !== 'undefined' && window.electronAPI?.loadSessionDisk) {
    try {
      const diskSession = await window.electronAPI.loadSessionDisk();
      if (diskSession && diskSession.rawData && diskSession.rawData.length > 0) {
        console.log(`[Storage] Successfully loaded session from Desktop disk file (${diskSession.rawData.length} rows)`);
        return diskSession;
      }
    } catch (err) {
      console.warn('[Storage] Failed to read desktop session file:', err);
    }
  }

  // 2. Try IndexedDB session
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      let isSettled = false;
      const loadTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          console.warn('[Storage] IndexedDB get timed out after 3500ms');
          resolve(null);
        }
      }, 3500);

      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('current_session');

        request.onsuccess = () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(loadTimer);
            const result = request.result || null;
            if (result && result.rawData && result.rawData.length > 0) {
              console.log(`[Storage] Successfully loaded session from IndexedDB (${result.rawData.length} rows)`);
            } else {
              console.log('[Storage] No active session record found in IndexedDB');
            }
            resolve(result);
          }
        };

        request.onerror = (e) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(loadTimer);
            console.error('[Storage] IndexedDB get error:', e.target.error);
            resolve(null);
          }
        };

        tx.onerror = (e) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(loadTimer);
            console.error('[Storage] IndexedDB readonly tx error:', e.target.error);
            resolve(null);
          }
        };
      } catch (txErr) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(loadTimer);
          console.error('[Storage] IndexedDB get transaction exception:', txErr);
          resolve(null);
        }
      }
    });
  } catch (err) {
    console.error('[Storage] Failed to load working session from IndexedDB:', err);
    return null;
  }
}

export async function clearWorkingSession() {
  try {
    localStorage.removeItem(META_KEY);
    if (typeof window !== 'undefined' && window.electronAPI?.clearSessionDisk) {
      try {
        window.electronAPI.clearSessionDisk();
      } catch (e) {}
    }

    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete('current_session');

        tx.oncomplete = () => {
          console.log('[Storage] Cleared active working session');
          resolve(true);
        };
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (err) {
    console.error('[Storage] Failed to clear working session from IndexedDB:', err);
    return false;
  }
}
