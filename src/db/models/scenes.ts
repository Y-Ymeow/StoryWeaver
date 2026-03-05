/**
 * 场景数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";
import type { Scene } from "@stores";

function encodeRoundPlan(value: any): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function decodeRoundPlan(value: string | null | undefined): any {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toSceneModel(row: any): Scene {
  return {
    id: row.id,
    room_id: row.room_id,
    name: row.name,
    description: row.description,
    goal: row.goal,
    setup: row.setup,
    summary: row.summary,
    max_rounds: row.max_rounds,
    round_plan: decodeRoundPlan(row.round_plan),
    order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createScene(
  scene: Omit<Scene, "id" | "created_at" | "updated_at"> & {
    round_plan?: string | null;
  },
): Promise<Scene> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.scenes.add({
    id,
    room_id: scene.room_id,
    name: scene.name,
    description: scene.description || "",
    goal: scene.goal || "",
    setup: scene.setup || "",
    summary: scene.summary || "",
    max_rounds: scene.max_rounds || 10,
    round_plan: encodeRoundPlan(scene.round_plan),
    sort_order: scene.order || 0,
    created_at: now,
    updated_at: now,
  } as any);

  await saveDBToFile();
  return await getSceneById(id);
}

export async function getAllScenes(): Promise<Scene[]> {
  const db = getDB();
  const rows = await db.scenes.toArray();
  return rows
    .sort((a: any, b: any) =>
      a.room_id.localeCompare(b.room_id) || a.sort_order - b.sort_order,
    )
    .map(toSceneModel);
}

export async function getScenesByRoomId(roomId: string): Promise<Scene[]> {
  const db = getDB();
  const rows = await db.scenes.where("room_id").equals(roomId).toArray();
  return rows.sort((a: any, b: any) => a.sort_order - b.sort_order).map(toSceneModel);
}

export async function getSceneById(id: string): Promise<Scene> {
  const db = getDB();
  const row = await db.scenes.get(id);
  if (!row) {
    throw new Error(`场景 ${id} 不存在`);
  }
  return toSceneModel(row);
}

export async function updateScene(
  id: string,
  updates: Partial<Scene> & { round_plan?: any },
): Promise<Scene> {
  const db = getDB();
  const now = Date.now();

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.goal !== undefined) patch.goal = updates.goal;
  if (updates.setup !== undefined) patch.setup = updates.setup;
  if (updates.summary !== undefined) patch.summary = updates.summary;
  if (updates.max_rounds !== undefined) patch.max_rounds = updates.max_rounds;
  if (updates.round_plan !== undefined) patch.round_plan = encodeRoundPlan(updates.round_plan);
  if (updates.order !== undefined) patch.sort_order = updates.order;

  if (Object.keys(patch).length > 0) {
    patch.updated_at = now;
    await db.scenes.update(id, patch);
    await saveDBToFile();
  }

  return await getSceneById(id);
}

export async function deleteScene(id: string): Promise<void> {
  const db = getDB();
  await db.scenes.delete(id);
  await saveDBToFile();
}
