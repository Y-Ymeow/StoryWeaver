/**
 * 房间数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";
import type { Room } from "@stores";

export async function createRoom(
  room: Omit<Room, "id" | "created_at" | "updated_at">,
): Promise<Room> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const row: Room = {
    id,
    name: room.name,
    setting: room.setting,
    plot_summary: room.plot_summary || "",
    worldview: room.worldview || "",
    tone: room.tone || "",
    current_performance_summary: room.current_performance_summary || "",
    max_scenes: Math.max(1, Math.min(200, room.max_scenes || 50)),
    created_at: now,
    updated_at: now,
  };

  await db.rooms.add(row as any);
  await saveDBToFile();
  return await getRoomById(id);
}

export async function getAllRooms(): Promise<Room[]> {
  const db = getDB();
  const rooms = await db.rooms.toArray();
  return rooms.sort((a: any, b: any) => b.updated_at - a.updated_at) as Room[];
}

export async function getRoomById(id: string): Promise<Room> {
  const db = getDB();
  const row = await db.rooms.get(id);
  if (!row) {
    throw new Error(`房间 ${id} 不存在`);
  }
  return row as Room;
}

export async function updateRoom(
  id: string,
  updates: Partial<Room>,
): Promise<Room> {
  const db = getDB();
  const now = Date.now();

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.setting !== undefined) patch.setting = updates.setting;
  if (updates.plot_summary !== undefined) patch.plot_summary = updates.plot_summary;
  if (updates.worldview !== undefined) patch.worldview = updates.worldview;
  if (updates.tone !== undefined) patch.tone = updates.tone;
  if (updates.current_performance_summary !== undefined) {
    patch.current_performance_summary = updates.current_performance_summary;
  }
  if (updates.max_scenes !== undefined) {
    patch.max_scenes = Math.max(1, Math.min(200, updates.max_scenes));
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = now;
    await db.rooms.update(id, patch);
    await saveDBToFile();
  }

  return await getRoomById(id);
}

export async function deleteRoom(id: string): Promise<void> {
  const db = getDB();

  const scenes = await db.scenes.where("room_id").equals(id).toArray();
  const sceneIds = scenes.map((s: any) => s.id);

  if (sceneIds.length > 0) {
    await db.performances.where("scene_id").anyOf(sceneIds).delete();
  }

  await db.scenes.where("room_id").equals(id).delete();
  await db.characters.where("room_id").equals(id).delete();
  await db.rooms.delete(id);

  await saveDBToFile();
}

export async function getRoomsByRoomId(_roomId: string): Promise<Room[]> {
  return [];
}
