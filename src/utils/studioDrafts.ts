const DB_NAME = "stark-studio-drafts";
const STORE = "drafts";
let connection: Promise<IDBDatabase> | undefined;

function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("Ta przeglądarka nie udostępnia zapisu szkiców."));
  if (!connection)
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("Zamknij inne karty aplikacji, aby odblokować zapis szkiców."));
      };
    });
  return connection;
}

export async function readStudioDraft<T>(key: string): Promise<T | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => {
      const saved = request.result;
      resolve(saved?.version === 1 ? (saved.value as T) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Jeden atomowy zapis obejmuje metadane i lokalne pliki; bez base64/localStorage. */
export async function writeStudioDraft<T>(key: string, value: T): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ version: 1, savedAt: Date.now(), value }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Zapis szkicu został przerwany."));
  });
}
