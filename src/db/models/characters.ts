/**
 * 角色数据表操作
 */

import { getDB, saveDBToFile } from "../core";
import type { Character } from "@stores";

/**
 * 创建角色
 */
export async function createCharacter(
  character: Omit<Character, "id" | "created_at" | "updated_at">,
): Promise<Character> {
  const db = getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const stmt = db.prepare(
    `INSERT INTO characters (id, room_id, name, background, dialogue_style, memory, is_user, type, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run([
    id,
    character.room_id,
    character.name,
    character.background || "",
    character.dialogue_style || "",
    character.memory || null,
    character.is_user ? 1 : 0,
    character.type || "ai",
    character.order || 0,
    now,
    now,
  ]);
  stmt.free();

  await saveDBToFile();
  return getCharacterById(id);
}

/**
 * 获取所有角色
 */
export async function getAllCharacters(): Promise<Character[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM characters ORDER BY room_id, sort_order"
  );
  const results: Character[] = [];

  while (stmt.step()) {
    const row = stmt.get() as any[];
    results.push({
      id: row[0] as string,
      room_id: row[1] as string,
      name: row[2] as string,
      background: row[3] as string,
      dialogue_style: row[4] as string,
      memory: row[5] as string,
      is_user: (row[6] as number) === 1,
      type: row[7] as "user" | "ai",
      order: row[8] as number,
      created_at: row[9] as number,
      updated_at: row[10] as number,
    });
  }
  stmt.free();

  return results;
}

/**
 * 根据房间 ID 获取角色列表
 */
export async function getCharactersByRoomId(roomId: string): Promise<Character[]> {
  const db = getDB();
  const stmt = db.prepare(
    "SELECT * FROM characters WHERE room_id = ? ORDER BY sort_order"
  );
  stmt.bind([roomId]);

  const results: Character[] = [];
  while (stmt.step()) {
    const row = stmt.get() as any[];
    results.push({
      id: row[0] as string,
      room_id: row[1] as string,
      name: row[2] as string,
      background: row[3] as string,
      dialogue_style: row[4] as string,
      memory: row[5] as string,
      is_user: (row[6] as number) === 1,
      type: row[7] as "user" | "ai",
      order: row[8] as number,
      created_at: row[9] as number,
      updated_at: row[10] as number,
    });
  }
  stmt.free();

  return results;
}

/**
 * 根据 ID 获取角色
 */
export function getCharacterById(id: string): Character {
  const db = getDB();
  const stmt = db.prepare("SELECT * FROM characters WHERE id = ?");
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error(`角色 ${id} 不存在`);
  }

  const row = stmt.get() as any[];
  stmt.free();

  return {
    id: row[0] as string,
    room_id: row[1] as string,
    name: row[2] as string,
    background: row[3] as string,
    dialogue_style: row[4] as string,
    memory: row[5] as string,
    is_user: (row[6] as number) === 1,
    type: row[7] as "user" | "ai",
    order: row[8] as number,
    created_at: row[9] as number,
    updated_at: row[10] as number,
  };
}

/**
 * 更新角色
 */
export async function updateCharacter(
  id: string,
  updates: Partial<Character>,
): Promise<Character> {
  const db = getDB();
  const now = Date.now();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.background !== undefined) {
    fields.push("background = ?");
    values.push(updates.background);
  }
  if (updates.dialogue_style !== undefined) {
    fields.push("dialogue_style = ?");
    values.push(updates.dialogue_style);
  }
  if (updates.memory !== undefined) {
    fields.push("memory = ?");
    values.push(updates.memory);
  }
  if (updates.is_user !== undefined) {
    fields.push("is_user = ?");
    values.push(updates.is_user ? 1 : 0);
  }
  if (updates.type !== undefined) {
    fields.push("type = ?");
    values.push(updates.type);
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
      `UPDATE characters SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(values);
    stmt.free();

    await saveDBToFile();
  }

  return getCharacterById(id);
}

/**
 * 更新角色记忆
 */
export async function updateCharacterMemory(
  id: string,
  memory: string,
): Promise<Character> {
  return updateCharacter(id, { memory });
}

/**
 * 删除角色
 */
export async function deleteCharacter(id: string): Promise<void> {
  const db = getDB();
  const stmt = db.prepare("DELETE FROM characters WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  await saveDBToFile();
}
