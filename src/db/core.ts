/**
 * 数据库核心模块（Dexie / IndexedDB）
 */

import type { Table } from "dexie";
import { dexieDB } from "./dexie";

export interface Database {
  rooms: Table<any, string>;
  scenes: Table<any, string>;
  characters: Table<any, string>;
  performances: Table<any, string>;
  system_settings: Table<any, string>;
  provider_configs: Table<any, string>;
  scene_performance_settings: Table<any, string>;
}

let dbInstance: Database | null = null;
let isInitializing = false;
let useMemoryMode = false;
let useOPFSMode = false;
let useIndexedDBMode = false;

export function isOPFSMode(): boolean {
  return useOPFSMode;
}

export function isIndexedDBMode(): boolean {
  return useIndexedDBMode;
}

export interface InitDBOptions {
  fileHandle?: FileSystemFileHandle | null;
  isNew?: boolean;
  useMemory?: boolean;
}

export async function initDB(_options?: InitDBOptions): Promise<Database> {
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
    await dexieDB.open();

    dbInstance = {
      rooms: dexieDB.rooms,
      scenes: dexieDB.scenes,
      characters: dexieDB.characters,
      performances: dexieDB.performances,
      system_settings: dexieDB.system_settings,
      provider_configs: dexieDB.provider_configs,
      scene_performance_settings: dexieDB.scene_performance_settings,
    };

    useMemoryMode = false;
    useOPFSMode = false;
    useIndexedDBMode = true;
    console.log("数据库以 IndexedDB (Dexie) 模式打开成功");

    return dbInstance;
  } catch (error) {
    console.error("数据库初始化失败:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

export async function saveDBToFile(): Promise<void> {
  if (!dbInstance) {
    throw new Error("数据库未初始化");
  }
}

export function setFileHandle(_handle: FileSystemFileHandle | null): void {
}

export function getDB(): Database {
  if (!dbInstance) {
    throw new Error("数据库未初始化，请先调用 initDB()");
  }
  return dbInstance;
}

export function closeDB(): void {
  dexieDB.close();
  dbInstance = null;
  useMemoryMode = false;
  useOPFSMode = false;
  useIndexedDBMode = false;
}

export function isMemoryMode(): boolean {
  return useMemoryMode;
}
