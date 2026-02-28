/**
 * 系统设置数据表操作
 */

import { getDB, saveDBToFile } from "../core";

/**
 * 获取设置值
 */
export function getSetting(key: string): string | null {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT value FROM system_settings WHERE key = ?"
  );
  stmt.bind([key]);

  if (stmt.step()) {
    const row = stmt.get() as any[];
    stmt.free();
    return row[0] as string;
  }
  stmt.free();
  return null;
}

/**
 * 设置值
 */
export async function setSetting(
  key: string,
  value: string,
): Promise<void> {
  const db = getDB();
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)"
  );
  stmt.run([key, value]);
  stmt.free();
  await saveDBToFile();
}

/**
 * 获取所有设置
 */
export function getAllSettings(): Record<string, string> {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM system_settings");
  const results: Record<string, string> = {};

  while (stmt.step()) {
    const row = stmt.get() as any[];
    results[row[0] as string] = row[1] as string;
  }
  stmt.free();

  return results;
}

/**
 * 删除设置
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM system_settings WHERE key = ?");
  stmt.run([key]);
  stmt.free();
  await saveDBToFile();
}
