/**
 * 房间数据表操作
 */

import { getDB, saveDBToFile } from "../core";
import type { Room } from "@stores";

/**
 * 创建房间
 */
export async function createRoom(
  room: Omit<Room, "id" | "created_at" | "updated_at">,
): Promise<Room> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    `INSERT INTO rooms (id, name, setting, plot_summary, worldview, tone, current_performance_summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  stmt.run([
    id,
    room.name,
    room.setting,
    room.plot_summary || "",
    room.worldview || "",
    room.tone || "",
    room.current_performance_summary || "",
    now,
    now,
  ]);
  stmt.free();

  await saveDBToFile();
  return getRoomById(id);
}

/**
 * 获取所有房间
 */
export async function getAllRooms(): Promise<Room[]> {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM rooms ORDER BY updated_at DESC");
  const results: Room[] = [];

  while (stmt.step()) {
    const row = stmt.get() as any[];
    results.push({
      id: row[0] as string,
      name: row[1] as string,
      setting: row[2] as string,
      plot_summary: row[3] as string,
      worldview: row[4] as string,
      tone: row[5] as string,
      current_performance_summary: row[6] as string,
      created_at: row[7] as number,
      updated_at: row[8] as number,
    });
  }

  stmt.free();

  return results;
}

/**
 * 根据 ID 获取房间
 */
export function getRoomById(id: string): Room {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error(`房间 ${id} 不存在`);
  }

  const row = stmt.get() as any[];
  stmt.free();

  return {
    id: row[0] as string,
    name: row[1] as string,
    setting: row[2] as string,
    plot_summary: row[3] as string,
    worldview: row[4] as string,
    tone: row[5] as string,
    current_performance_summary: row[6] as string,
    created_at: row[7] as number,
    updated_at: row[8] as number,
  };
}

/**
 * 更新房间
 */
export async function updateRoom(
  id: string,
  updates: Partial<Room>,
): Promise<Room> {
  const db = getDB();
  const now = Date.now();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.setting !== undefined) {
    fields.push("setting = ?");
    values.push(updates.setting);
  }
  if (updates.plot_summary !== undefined) {
    fields.push("plot_summary = ?");
    values.push(updates.plot_summary);
  }
  if (updates.worldview !== undefined) {
    fields.push("worldview = ?");
    values.push(updates.worldview);
  }
  if (updates.tone !== undefined) {
    fields.push("tone = ?");
    values.push(updates.tone);
  }
  if (updates.current_performance_summary !== undefined) {
    fields.push("current_performance_summary = ?");
    values.push(updates.current_performance_summary);
  }

  if (fields.length > 0) {
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    const stmt = db.prepare(
      `UPDATE rooms SET ${fields.join(", ")} WHERE id = ?`,
    );
    stmt.run(values);
    stmt.free();

    await saveDBToFile();
  }

  return getRoomById(id);
}

/**
 * 删除房间（同时删除相关的场景、角色、演出记录）
 */
export async function deleteRoom(id: string): Promise<void> {
  const db = getDB();

  // 先删除相关的演出记录
  const scenesStmt = db.prepare("SELECT id FROM scenes WHERE room_id = ?");
  scenesStmt.bind([id]);
  const sceneIds: string[] = [];
  while (scenesStmt.step()) {
    const row = scenesStmt.get() as any[];
    sceneIds.push(row[0] as string);
  }
  scenesStmt.free();

  // 删除每个场景的演出记录
  for (const sceneId of sceneIds) {
    const deletePerfStmt = db.prepare(
      "DELETE FROM performances WHERE scene_id = ?",
    );
    deletePerfStmt.run([sceneId]);
    deletePerfStmt.free();
  }

  // 删除场景
  const deleteScenesStmt = db.prepare("DELETE FROM scenes WHERE room_id = ?");
  deleteScenesStmt.run([id]);
  deleteScenesStmt.free();

  // 删除角色
  const deleteCharsStmt = db.prepare(
    "DELETE FROM characters WHERE room_id = ?",
  );
  deleteCharsStmt.run([id]);
  deleteCharsStmt.free();

  // 删除房间
  const stmt = db.prepare("DELETE FROM rooms WHERE id = ?");
  stmt.run([id]);
  stmt.free();

  await saveDBToFile();
}

/**
 * 获取房间的房间列表
 */
export async function getRoomsByRoomId(_roomId: string): Promise<Room[]> {
  return [];
}
