/**
 * 场景数据表操作
 */

import { getDB, saveDBToFile } from "../core";
import type { Scene } from "@stores";

/**
 * 创建场景
 */
export async function createScene(
  scene: Omit<Scene, "id" | "created_at" | "updated_at"> & {
    round_plan?: string | null;
  },
): Promise<Scene> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    `INSERT INTO scenes (id, room_id, name, description, goal, setup, summary, max_rounds, round_plan, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run([
    id,
    scene.room_id,
    scene.name,
    scene.description || "",
    scene.goal || "",
    scene.setup || "",
    scene.summary || "",
    scene.max_rounds || 10,
    scene.round_plan ? JSON.stringify(scene.round_plan) : null,
    scene.order || 0,
    now,
    now,
  ]);
  stmt.free();

  await saveDBToFile();
  return getSceneById(id);
}

/**
 * 获取所有场景
 */
export async function getAllScenes(): Promise<Scene[]> {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM scenes ORDER BY room_id, sort_order");
  const results: Scene[] = [];

  while (stmt.step()) {
    const row = stmt.getAsObject() as Scene;
    results.push({
      ...row,
      round_plan: row.round_plan ? JSON.parse(row.round_plan) : undefined,
    });
  }
  stmt.free();

  return results;
}

/**
 * 根据房间 ID 获取场景列表
 */
export async function getScenesByRoomId(roomId: string): Promise<Scene[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM scenes WHERE room_id = ? ORDER BY sort_order",
  );
  stmt.bind([roomId]);

  const results: Scene[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Scene;
    results.push({
      ...row,
      round_plan: row.round_plan ? JSON.parse(row.round_plan) : undefined,
    });
  }
  stmt.free();

  return results;
}

/**
 * 根据 ID 获取场景
 */
export function getSceneById(id: string): Scene {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM scenes WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error(`场景 ${id} 不存在`);
  }

  const row = stmt.getAsObject() as Scene;
  stmt.free();

  row.round_plan = row.round_plan ? JSON.parse(row.round_plan) : undefined;

  return row;
}

/**
 * 更新场景
 */
export async function updateScene(
  id: string,
  updates: Partial<Scene> & { round_plan?: any },
): Promise<Scene> {
  const db = getDB();
  const now = Date.now();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.goal !== undefined) {
    fields.push("goal = ?");
    values.push(updates.goal);
  }
  if (updates.setup !== undefined) {
    fields.push("setup = ?");
    values.push(updates.setup);
  }
  if (updates.summary !== undefined) {
    fields.push("summary = ?");
    values.push(updates.summary);
  }
  if (updates.max_rounds !== undefined) {
    fields.push("max_rounds = ?");
    values.push(updates.max_rounds);
  }
  if (updates.round_plan !== undefined) {
    fields.push("round_plan = ?");
    values.push(updates.round_plan ? JSON.stringify(updates.round_plan) : null);
  }
  if (updates.order !== undefined) {
    fields.push("sort_order = ?");
    values.push(updates.order);
  }

  if (fields.length > 0) {
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE scenes SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(values);
    stmt.free();

    await saveDBToFile();
  }

  return getSceneById(id);
}

/**
 * 删除场景
 */
export async function deleteScene(id: string): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM scenes WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  await saveDBToFile();
}
