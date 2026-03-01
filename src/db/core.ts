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
} from "./file-system";

// 数据库实例
let dbInstance: SqlJsDatabase | null = null;
let fileHandle: FileSystemFileHandle | null = null;
let isInitializing = false;
let useMemoryMode = false;

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
  // 获取当前页面的 base URL（处理 GitHub Pages 子路径）
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sql-wasm.wasm`;
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
      const dbData = await readFileData(handle);

      if (dbData && !options.isNew) {
        db = new SQL.Database(dbData);
        console.log("数据库从文件加载成功");
      } else {
        db = new SQL.Database();
        console.log("创建新数据库");
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

  if (fileHandle && !useMemoryMode) {
    await writeFileData(fileHandle, data);
  } else if (!useMemoryMode) {
    // 如果没有文件句柄但有存储的句柄，尝试获取
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
