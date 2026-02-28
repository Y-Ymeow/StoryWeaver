/**
 * 数据库文件句柄管理
 * 使用 IndexedDB 存储文件句柄（更可靠的方式）
 */

const DB_NAME = 'ai-cinama-file-handles'
const STORE_NAME = 'handles'
const DB_VERSION = 1
const HANDLE_KEY = 'db-handle'

/**
 * 打开 IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * 检查是否支持 File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

/**
 * 从 IndexedDB 获取保存的文件句柄
 */
export async function getStoredFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(HANDLE_KEY)
      
      request.onsuccess = () => {
        resolve(request.result || null)
      }
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
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(fileHandle, HANDLE_KEY)
      
      request.onsuccess = () => {
        console.log('文件句柄已保存')
        resolve()
      }
      request.onerror = () => {
        console.error('保存文件句柄失败:', request.error)
        reject(request.error)
      }
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
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(HANDLE_KEY)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
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
      types: [
        {
          description: 'SQLite 数据库文件',
          accept: {
            'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']
          }
        }
      ],
      multiple: false,
      excludeAcceptAllOption: false
    })
    
    const [fileHandle] = await picker
    return fileHandle
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      // 用户取消选择
      return null
    }
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
      types: [
        {
          description: 'SQLite 数据库文件',
          accept: {
            'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3']
          }
        }
      ]
    })
    
    return fileHandle
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return null
    }
    throw err
  }
}

/**
 * 从文件句柄读取数据
 */
export async function readFileData(fileHandle: FileSystemFileHandle): Promise<Uint8Array | null> {
  try {
    const file = await fileHandle.getFile()
    if (file.size === 0) {
      return null
    }
    const arrayBuffer = await file.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.error('读取文件失败:', err)
    return null
  }
}

/**
 * 将数据写入文件句柄
 */
export async function writeFileData(
  fileHandle: FileSystemFileHandle,
  data: Uint8Array
): Promise<void> {
  try {
    const writable = await fileHandle.createWritable()
    // 转换为 ArrayBuffer 写入
    await writable.write(data.buffer as ArrayBuffer)
    await writable.close()
    console.log('数据库已保存')
  } catch (err) {
    console.error('写入文件失败:', err)
    throw err
  }
}
