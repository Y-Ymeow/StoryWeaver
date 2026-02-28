/**
 * 演出记录数据表操作
 */

import { getDB, saveDBToFile } from "../core";
import type { Performance } from "@stores";

/**
 * 解析 JSON 内容
 */
function parseContent(content: string): Record<string, string> {
  try {
    return JSON.parse(content);
  } catch {
    // 兼容旧数据格式
    return { dialogue: content };
  }
}

/**
 * 序列化内容为 JSON
 */
function serializeContent(content: Record<string, string>): string {
  return JSON.stringify(content);
}

/**
 * 获取主要类型
 */
function getPrimaryType(
  content: Record<string, string>,
): Performance["primary_type"] {
  if (content.dialogue) return "dialogue";
  if (content.action) return "action";
  if (content.thought) return "thought";
  if (content.emotion) return "emotion";
  return "dialogue";
}

/**
 * 创建演出记录
 */
export async function createPerformance(
  performance: Omit<Performance, "id" | "created_at" | "content"> & {
    content: Record<string, string> | string;
  },
): Promise<Performance> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  // 处理内容
  const contentObj =
    typeof performance.content === "string"
      ? parseContent(performance.content)
      : performance.content;
  const contentStr = serializeContent(contentObj);
  const primaryType = performance.primary_type || getPrimaryType(contentObj);

  const stmt = db.prepare(
    `INSERT INTO performances (id, scene_id, character_id, content, primary_type, type, round, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run([
    id,
    performance.scene_id,
    performance.character_id,
    contentStr,
    primaryType,
    primaryType, // type 字段兼容
    performance.round || 1,
    performance.order || 0,
    now,
  ]);
  stmt.free();

  await saveDBToFile();
  return getPerformanceById(id);
}

/**
 * 批量创建演出记录
 */
export async function createPerformances(
  performances: (Omit<Performance, "id" | "created_at"> & {
    content: Record<string, string> | string;
  })[],
): Promise<Performance[]> {
  const results: Performance[] = [];
  for (const perf of performances) {
    const result = await createPerformance(perf);
    results.push(result);
  }
  return results;
}

/**
 * 获取所有演出记录
 */
export async function getAllPerformances(): Promise<Performance[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM performances ORDER BY created_at DESC",
  );
  const results: Performance[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as Performance;
    results.push(row);
  }
  stmt.free();

  return results;
}

/**
 * 根据场景 ID 获取演出记录
 */
export async function getPerformancesBySceneId(
  sceneId: string,
): Promise<Performance[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM performances WHERE scene_id = ? ORDER BY round, sort_order, created_at",
  );
  stmt.bind([sceneId]);

  const results: Performance[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Performance;
    // row.content = row.content ? JSON.parse(row.content) : row.content;
    results.push(row);
  }
  stmt.free();

  return results;
}

/**
 * 根据轮次获取演出记录
 */
export async function getPerformancesByRound(
  sceneId: string,
  round: number,
): Promise<Performance[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM performances WHERE scene_id = ? AND round = ? ORDER BY sort_order, created_at",
  );
  stmt.bind([sceneId, round]);

  const results: Performance[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Performance;
    results.push(row);
  }
  stmt.free();

  return results;
}

/**
 * 根据 ID 获取演出记录
 */
export function getPerformanceById(id: string): Performance {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM performances WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error(`演出记录 ${id} 不存在`);
  }

  const row = stmt.getAsObject() as Performance;
  stmt.free();

  return row;
}

/**
 * 获取当前最大轮次
 */
export function getMaxRound(sceneId: string): number {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT MAX(round) FROM performances WHERE scene_id = ?",
  );
  stmt.bind([sceneId]);

  if (stmt.step()) {
    const row = stmt.get() as any[];
    stmt.free();
    return (row[0] as number) || 0;
  }
  stmt.free();
  return 0;
}

/**
 * 删除演出记录
 */
export async function deletePerformance(id: string): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM performances WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  await saveDBToFile();
}

/**
 * 删除场景的所有演出记录
 */
export async function deletePerformancesBySceneId(
  sceneId: string,
): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM performances WHERE scene_id = ?");
  stmt.run([sceneId]);
  stmt.free();
  await saveDBToFile();
}

/**
 * 更新演出记录
 */
export async function updatePerformance(
  id: string,
  updates: Partial<Performance> & { content?: Record<string, string> },
): Promise<Performance> {
  const db = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    fields.push("content = ?");
    const contentObj =
      typeof updates.content === "string"
        ? updates.content
        : serializeContent(updates.content);
    values.push(contentObj);
  }
  if (updates.primary_type !== undefined) {
    fields.push("primary_type = ?");
    values.push(updates.primary_type);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
  }
  if (updates.round !== undefined) {
    fields.push("round = ?");
    values.push(updates.round);
  }
  if (updates.order !== undefined) {
    fields.push("sort_order = ?");
    values.push(updates.order);
  }

  if (fields.length > 0) {
    values.push(id);
    const stmt = db.prepare(
      `UPDATE performances SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(values);
    stmt.free();
    await saveDBToFile();
  }

  return getPerformanceById(id);
}
