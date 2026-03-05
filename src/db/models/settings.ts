/**
 * 系统设置数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";

export async function getSetting(key: string): Promise<string | null> {
  const db = getDB();
  const row = await db.system_settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(
  key: string,
  value: string,
): Promise<void> {
  const db = getDB();
  await db.system_settings.put({ key, value } as any);
  await saveDBToFile();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDB();
  const rows = await db.system_settings.toArray();

  const results: Record<string, string> = {};
  for (const row of rows as Array<{ key: string; value: string }>) {
    results[row.key] = row.value;
  }
  return results;
}

export async function deleteSetting(key: string): Promise<void> {
  const db = getDB();
  await db.system_settings.delete(key);
  await saveDBToFile();
}
