/**
 * 角色数据表操作（Dexie）
 */

import { getDB, saveDBToFile } from "../core";
import type { Character } from "@stores";

function toCharacterModel(row: any): Character {
  return {
    id: row.id,
    room_id: row.room_id,
    name: row.name,
    background: row.background,
    dialogue_style: row.dialogue_style,
    memory: row.memory,
    is_user: row.is_user === 1 || row.is_user === true,
    type: row.type,
    order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createCharacter(
  character: Omit<Character, "id" | "created_at" | "updated_at">,
): Promise<Character> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.characters.add({
    id,
    room_id: character.room_id,
    name: character.name,
    background: character.background || "",
    dialogue_style: character.dialogue_style || "",
    memory: character.memory || null,
    is_user: character.is_user ? 1 : 0,
    type: character.type || "ai",
    sort_order: character.order || 0,
    created_at: now,
    updated_at: now,
  } as any);

  await saveDBToFile();
  return await getCharacterById(id);
}

export async function getAllCharacters(): Promise<Character[]> {
  const db = getDB();
  const rows = await db.characters.toArray();
  return rows
    .sort((a: any, b: any) =>
      a.room_id.localeCompare(b.room_id) || a.sort_order - b.sort_order,
    )
    .map(toCharacterModel);
}

export async function getCharactersByRoomId(roomId: string): Promise<Character[]> {
  const db = getDB();
  const rows = await db.characters.where("room_id").equals(roomId).toArray();
  return rows.sort((a: any, b: any) => a.sort_order - b.sort_order).map(toCharacterModel);
}

export async function getCharacterById(id: string): Promise<Character> {
  const db = getDB();
  const row = await db.characters.get(id);
  if (!row) {
    throw new Error(`角色 ${id} 不存在`);
  }
  return toCharacterModel(row);
}

export async function updateCharacter(
  id: string,
  updates: Partial<Character>,
): Promise<Character> {
  const db = getDB();
  const now = Date.now();

  const patch: Record<string, any> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.background !== undefined) patch.background = updates.background;
  if (updates.dialogue_style !== undefined) patch.dialogue_style = updates.dialogue_style;
  if (updates.memory !== undefined) patch.memory = updates.memory;
  if (updates.is_user !== undefined) patch.is_user = updates.is_user ? 1 : 0;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.order !== undefined) patch.sort_order = updates.order;

  if (Object.keys(patch).length > 0) {
    patch.updated_at = now;
    await db.characters.update(id, patch);
    await saveDBToFile();
  }

  return await getCharacterById(id);
}

export async function updateCharacterMemory(
  id: string,
  memory: string,
): Promise<Character> {
  return await updateCharacter(id, { memory });
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = getDB();
  await db.characters.delete(id);
  await saveDBToFile();
}
