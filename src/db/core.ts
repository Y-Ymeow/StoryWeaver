/**
 * 数据库核心模块
 * 包含数据库初始化和基本操作，不包含模型操作以避免循环依赖
 */

import { runMigrations } from "./migrations";
import type { Database as SqlJsDatabase } from "sql.js";
import {
  getStoredFileHandle,
  storeFileHandle,
  readFileData,
  writeFileData,
  loadFromOPFS,
  saveToOPFS,
  isOPFSSupported,
} from "./file-system";

// 数据库实例
let dbInstance: SqlJsDatabase | null = null;
let fileHandle: FileSystemFileHandle | null = null;
let isInitializing = false;
let useMemoryMode = false;
let useOPFSMode = false;

// 检查句柄是否是 OPFS 句柄
function isOPFSHandle(handle: FileSystemFileHandle): boolean {
  return (handle as any).__isOPFS === true;
}

export function isOPFSMode(): boolean {
  return useOPFSMode;
}

export type Database = SqlJsDatabase;

/**
 * 动态导入 sql.js
 */
async function loadSqlJs() {
  const sqlJsModule = await import("sql.js");
  return sqlJsModule.default;
}

/**
 * 获取 wasm 文件的正确路径
 */
function getWasmPath(): string {
  // 使用 Vite 的 URL 导入获取正确的 WASM 文件路径
  // 在 GitHub Pages 等子路径部署时也能正确工作
  const wasmUrl = new URL("sql.js/dist/sql-wasm.wasm", import.meta.url);
  return wasmUrl.href;
}

/**
 * 初始化数据库
 */
export interface InitDBOptions {
  fileHandle?: FileSystemFileHandle | null;
  isNew?: boolean;
  useMemory?: boolean;
}

export async function initDB(options?: InitDBOptions): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return dbInstance!;
  }

  isInitializing = true;

  try {
    const initSqlJs = await loadSqlJs();
    const wasmPath = getWasmPath();

    const SQL = await initSqlJs({
      locateFile: (_file: string) => wasmPath,
    });

    let db: SqlJsDatabase;
    let handle: FileSystemFileHandle | null = null;

    if (options?.fileHandle) {
      handle = options.fileHandle;

      // 检查是否是 OPFS 句柄
      if (isOPFSHandle(handle)) {
        // OPFS 模式
        useOPFSMode = true;
        const dbData = await loadFromOPFS();
        if (dbData && !options.isNew) {
          db = new SQL.Database(dbData);
          console.log("数据库从 OPFS 加载成功");
        } else {
          db = new SQL.Database();
          console.log("创建新的 OPFS 数据库");
        }
      } else {
        // File System Access API 模式
        const dbData = await readFileData(handle);
        if (dbData && !options.isNew) {
          db = new SQL.Database(dbData);
          console.log("数据库从文件加载成功");
        } else {
          db = new SQL.Database();
          console.log("创建新数据库");
        }
      }
    } else if (options?.useMemory) {
      db = new SQL.Database();
      useMemoryMode = true;
      console.log("使用内存模式");
    } else {
      handle = await getStoredFileHandle();

      if (handle) {
        const dbData = await readFileData(handle);
        if (dbData) {
          db = new SQL.Database(dbData);
          console.log("数据库从存储句柄加载成功");
        } else {
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }
    }

    runMigrations(db);

    dbInstance = db;
    fileHandle = handle;

    return db;
  } catch (error) {
    console.error("数据库初始化失败:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * 保存数据库到文件
 */
export async function saveDBToFile(): Promise<void> {
  if (!dbInstance) {
    throw new Error("数据库未初始化");
  }

  const data = dbInstance.export();

  if (useOPFSMode) {
    // OPFS 模式
    await saveToOPFS(data);
  } else if (fileHandle && !useMemoryMode) {
    // File System Access API 模式
    await writeFileData(fileHandle, data);
  } else if (!useMemoryMode) {
    // 尝试获取存储的句柄
    const storedHandle = await getStoredFileHandle();
    if (storedHandle) {
      await writeFileData(storedHandle, data);
      fileHandle = storedHandle;
    }
  }
  // 内存模式下不保存
}

/**
 * 设置文件句柄
 */
export function setFileHandle(handle: FileSystemFileHandle): void {
  fileHandle = handle;
}

/**
 * 获取数据库实例
 */
export function getDB(): Database {
  if (!dbInstance) {
    throw new Error("数据库未初始化，请先调用 initDB()");
  }
  return dbInstance;
}

/**
 * 关闭数据库
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 检查是否使用内存模式
 */
export function isMemoryMode(): boolean {
  return useMemoryMode;
}
