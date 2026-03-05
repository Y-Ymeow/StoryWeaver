/**
 * Dexie 模式下迁移占位（保留兼容导出）
 */

import type { Database } from "./index";

export interface Migration {
  version: number;
  description: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

export const migrations: Migration[] = [];

export async function runMigrations(_db: Database): Promise<void> {
  // Dexie 通过 version().stores() 管理 schema。
}
