/**
 * 角色辅助工具模块
 */

import type { Character } from "@/stores";

/**
 * 根据角色名找到角色对象，如果找不到则创建临时角色对象
 * @param name 角色名称
 * @param characters 角色列表
 * @param performerInfo 表演者信息（用于创建临时角色）
 */
export function findOrCreateCharacter(
  name: string,
  characters: Character[],
  performerInfo?: {
    characterId: string;
    isTemp?: boolean;
  }
): Character {
  // 尝试在角色表中查找
  const character = characters.find((c) => c.name === name);

  if (character) {
    return character;
  }

  // 找不到，创建临时角色对象
  // 对于临时角色，优先使用传入的 characterId，保证 ID 一致性
  return {
    id: performerInfo?.isTemp && performerInfo?.characterId
      ? performerInfo.characterId
      : (performerInfo?.characterId || `temp_${Date.now()}`),
    name,
    background: performerInfo?.isTemp ? `${name}（临时角色）` : name,
    dialogue_style: "自然口语",
    is_user: false,
    memory: null,
    type: "ai",
    room_id: "",
    order: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

/**
 * 判断角色是否是临时角色
 */
export function isTempCharacter(character: Character): boolean {
  return character.id.startsWith('temp_') || character.background?.includes('临时角色');
}
