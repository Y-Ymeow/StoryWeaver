/**
 * 数据库文件管理
 * 优先使用 File System Access API（桌面端），降级使用 OPFS（移动端）
 */

const DB_NAME = 'ai-cinama.db'
const OPFS_ROOT = 'ai-cinama'
const INDEXED_DB_NAME = 'ai-cinama-file-handles'
const INDEXED_STORE_NAME = 'handles'

/**
 * 检查是否支持 File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

/**
 * 检查是否支持 OPFS
 */
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

// ============ File System Access API ============

/**
 * 打开 IndexedDB（用于存储文件句柄）
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(INDEXED_STORE_NAME)) {
        db.createObjectStore(INDEXED_STORE_NAME)
      }
    }
  })
}

/**
 * 从 IndexedDB 获取保存的文件句柄
 */
export async function getStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIndexedDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(INDEXED_STORE_NAME, 'readonly')
      const store = transaction.objectStore(INDEXED_STORE_NAME)
      const request = store.get('db-handle')
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => {
        console.warn('读取文件句柄失败:', request.error)
        resolve(null)
      }
    })
  } catch (err) {
    console.warn('无法从 IndexedDB 读取文件句柄:', err)
    return null
  }
}

/**
 * 保存文件句柄到 IndexedDB
 */
export async function storeFileHandle(fileHandle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(INDEXED_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(INDEXED_STORE_NAME)
      const request = store.put(fileHandle, 'db-handle')
      request.onsuccess = () => {
        console.log('文件句柄已保存到 IndexedDB')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('无法保存文件句柄到 IndexedDB:', err)
    throw err
  }
}

/**
 * 清除存储的文件句柄
 */
export async function clearStoredFileHandle(): Promise<void> {
  try {
    const db = await openIndexedDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(INDEXED_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(INDEXED_STORE_NAME)
      const request = store.delete('db-handle')
      request.onsuccess = () => resolve()
      request.onerror = () => resolve() // 忽略错误
    })
  } catch (err) {
    console.warn('清除文件句柄失败:', err)
  }
}

/**
 * 让用户选择数据库文件
 */
export async function selectDatabaseFile(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API')
  }

  try {
    const picker = (window as any).showOpenFilePicker({
      types: [{
        description: 'SQLite 数据库文件',
        accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] }
      }],
      multiple: false,
      excludeAcceptAllOption: false
    })
    const [fileHandle] = await picker
    return fileHandle
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    throw err
  }
}

/**
 * 创建新的数据库文件
 */
export async function createDatabaseFile(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API')
  }

  try {
    const fileHandle = await (window as any).showSaveFilePicker({
      suggestedName: 'ai-cinama.db',
      types: [{
        description: 'SQLite 数据库文件',
        accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] }
      }]
    })
    return fileHandle
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null
    throw err
  }
}

// ============ OPFS ============

/**
 * 获取 OPFS 根目录
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(OPFS_ROOT, { create: true });
}

/**
 * 获取 OPFS 中的数据库文件句柄
 */
export async function getOPFSFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const root = await getOPFSRoot();
    const fileHandle = await root.getFileHandle(DB_NAME, { create: true });
    return fileHandle;
  } catch (err) {
    console.warn('获取 OPFS 文件失败:', err);
    return null;
  }
}

/**
 * 从 OPFS 读取数据
 */
export async function readOPFSFileData(fileHandle: FileSystemFileHandle): Promise<Uint8Array | null> {
  try {
    const file = await fileHandle.getFile();
    if (file.size === 0) return null;
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.error('读取 OPFS 文件失败:', err);
    return null;
  }
}

/**
 * 写入数据到 OPFS
 */
export async function writeOPFSFileData(fileHandle: FileSystemFileHandle, data: Uint8Array): Promise<void> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();
    console.log('数据库已保存到 OPFS');
  } catch (err) {
    console.error('写入 OPFS 文件失败:', err);
    throw err;
  }
}

/**
 * 从 OPFS 加载数据库
 */
export async function loadFromOPFS(): Promise<Uint8Array | null> {
  const fileHandle = await getOPFSFileHandle();
  if (!fileHandle) return null;
  return await readOPFSFileData(fileHandle);
}

/**
 * 保存数据库到 OPFS
 */
export async function saveToOPFS(data: Uint8Array): Promise<void> {
  const fileHandle = await getOPFSFileHandle();
  if (!fileHandle) throw new Error('无法获取 OPFS 文件句柄');
  await writeOPFSFileData(fileHandle, data);
}

/**
 * 清除 OPFS 中的数据库
 */
export async function clearOPFS(): Promise<void> {
  try {
    const root = await getOPFSRoot();
    // 先检查文件是否存在
    try {
      await root.getFileHandle(DB_NAME);
      // 文件存在，删除它
      await root.removeEntry(DB_NAME);
      console.log('OPFS 数据库已清除');
    } catch (err) {
      // 文件不存在，忽略错误
      console.log('OPFS 数据库不存在，无需清除');
    }
  } catch (err) {
    console.warn('清除 OPFS 数据库失败:', err);
  }
}

// ============ 通用文件操作 ============

/**
 * 从文件句柄读取数据
 */
export async function readFileData(fileHandle: FileSystemFileHandle): Promise<Uint8Array | null> {
  try {
    const file = await fileHandle.getFile();
    if (file.size === 0) return null;
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.error('读取文件失败:', err);
    return null;
  }
}

/**
 * 将数据写入文件句柄
 */
export async function writeFileData(fileHandle: FileSystemFileHandle, data: Uint8Array): Promise<void> {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();
    console.log('数据库已保存');
  } catch (err) {
    console.error('写入文件失败:', err);
    throw err;
  }
}
