/**
 * 录音 Blob 的 IndexedDB 极简封装:按历史条目 id 存取。
 * localStorage 存不下音频(几 MB),所以历史录音放这里。
 */

const DB_NAME = 'expression-trainer'
const STORE = 'audio'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = fn(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

/** 保存音频;失败(隐私模式等)静默吞掉,不影响训练流程 */
export async function putAudio(id: string, blob: Blob): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(blob, id))
  } catch {
    // ignore
  }
}

export async function getAudio(id: string): Promise<Blob | null> {
  try {
    const result = await run('readonly', (store) => store.get(id))
    return result instanceof Blob ? result : null
  } catch {
    return null
  }
}

export async function deleteAudio(id: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(id))
  } catch {
    // ignore
  }
}
