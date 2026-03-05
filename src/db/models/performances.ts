/**
 * 演出记录数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";
import type { Performance } from "@stores";

function parseContent(content: string): Record<string, string> {
  try {
    return JSON.parse(content);
  } catch {
    return { dialogue: content };
  }
}

function serializeContent(content: Record<string, string>): string {
  return JSON.stringify(content);
}

function getPrimaryType(
  content: Record<string, string>,
): Performance["primary_type"] {
  if (content.dialogue) return "dialogue";
  if (content.action) return "action";
  if (content.thought) return "thought";
  if (content.emotion) return "emotion";
  return "dialogue";
}

function toPerformanceModel(row: any): Performance {
  return {
    id: row.id,
    scene_id: row.scene_id,
    character_id: row.character_id,
    content: row.content,
    primary_type: row.primary_type,
    type: row.type,
    round: row.round,
    order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function createPerformance(
  performance: Omit<Performance, "id" | "created_at" | "content"> & {
    content: Record<string, string> | string;
  },
): Promise<Performance> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const contentObj =
    typeof performance.content === "string"
      ? parseContent(performance.content)
      : performance.content;
  const contentStr = serializeContent(contentObj);
  const primaryType = performance.primary_type || getPrimaryType(contentObj);

  await db.performances.add({
    id,
    scene_id: performance.scene_id,
    character_id: performance.character_id,
    content: contentStr,
    primary_type: primaryType,
    type: primaryType,
    round: performance.round || 1,
    sort_order: performance.order || 0,
    created_at: now,
  } as any);

  await saveDBToFile();
  return await getPerformanceById(id);
}

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

export async function getAllPerformances(): Promise<Performance[]> {
  const db = getDB();
  const rows = await db.performances.toArray();
  return rows
    .sort((a: any, b: any) => b.created_at - a.created_at)
    .map(toPerformanceModel);
}

export async function getPerformancesBySceneId(
  sceneId: string,
): Promise<Performance[]> {
  const db = getDB();
  const rows = await db.performances.where("scene_id").equals(sceneId).toArray();
  return rows
    .sort(
      (a: any, b: any) =>
        a.round - b.round || a.sort_order - b.sort_order || a.created_at - b.created_at,
    )
    .map(toPerformanceModel);
}

export async function getPerformancesByRound(
  sceneId: string,
  round: number,
): Promise<Performance[]> {
  const rows = await getPerformancesBySceneId(sceneId);
  return rows.filter((row) => row.round === round);
}

export async function getPerformanceById(id: string): Promise<Performance> {
  const db = getDB();
  const row = await db.performances.get(id);

  if (!row) {
    throw new Error(`演出记录 ${id} 不存在`);
  }

  return toPerformanceModel(row);
}

export async function getMaxRound(sceneId: string): Promise<number> {
  const rows = await getPerformancesBySceneId(sceneId);
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((row) => row.round || 0));
}

export async function deletePerformance(id: string): Promise<void> {
  const db = getDB();
  await db.performances.delete(id);
  await saveDBToFile();
}

export async function deletePerformancesBySceneId(
  sceneId: string,
): Promise<void> {
  const db = getDB();
  await db.performances.where("scene_id").equals(sceneId).delete();
  await saveDBToFile();
}

export async function updatePerformance(
  id: string,
  updates: Partial<Performance> & { content?: Record<string, string> },
): Promise<Performance> {
  const db = getDB();
  const patch: Record<string, any> = {};

  if (updates.content !== undefined) {
    patch.content =
      typeof updates.content === "string"
        ? updates.content
        : serializeContent(updates.content);
  }
  if (updates.primary_type !== undefined) patch.primary_type = updates.primary_type;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.round !== undefined) patch.round = updates.round;
  if (updates.order !== undefined) patch.sort_order = updates.order;

  if (Object.keys(patch).length > 0) {
    await db.performances.update(id, patch);
    await saveDBToFile();
  }

  return await getPerformanceById(id);
}
