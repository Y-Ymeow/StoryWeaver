/**
 * 演出轮次规则模块
 */

import type { Character, Performance } from "@/stores";

export interface Performer {
  characterId: string;
  characterName: string;
  isUser: boolean;
  types: string[];
}

export interface RoundPlanItem {
  round: number;
  description: string;
  performances: Performer[];
}

/**
 * 获取当前轮次中下一个待表演的角色（按顺序）
 * 只返回第一个还没表演的角色，保证顺序执行
 */
export function getNextPerformer(
  currentRound: number,
  roundPlan: RoundPlanItem[],
  performances: Performance[],
  characters: Character[]
): Performer | null {
  const currentRoundPlan = roundPlan.find((r) => r.round === currentRound);
  const currentRoundPerfs = performances.filter((p) => p.round === currentRound);
  const performedCharNames = currentRoundPerfs.map((p) => {
    const char = characters.find((c) => c.id === p.character_id);
    return char?.name;
  }).filter(Boolean);

  if (currentRoundPlan && currentRoundPlan.performances) {
    // 按顺序找第一个还没表演的
    for (const performer of currentRoundPlan.performances) {
      if (!performedCharNames.includes(performer.characterName || performer.characterId)) {
        return performer;
      }
    }
    return null; // 本轮所有人都表演完了
  }

  // 没有计划时，返回第一个未表演的 AI 角色
  const aiChar = characters.find(
    (c) => !c.is_user && !currentRoundPerfs.some((p) => p.character_id === c.id)
  );
  if (aiChar) {
    return {
      characterId: aiChar.id,
      characterName: aiChar.name,
      isUser: false,
      types: ["dialogue"],
    };
  }
  return null;
}

/**
 * 获取当前轮所有待表演的角色（兼容旧逻辑）
 */
export function getPendingPerformers(
  currentRound: number,
  roundPlan: RoundPlanItem[],
  performances: Performance[],
  characters: Character[]
): Performer[] {
  const next = getNextPerformer(currentRound, roundPlan, performances, characters);
  return next ? [next] : [];
}

/**
 * 检查当前轮是否所有角色都表演完了
 */
export function isRoundComplete(
  currentRound: number,
  roundPlan: RoundPlanItem[],
  performances: Performance[],
  characters: Character[]
): boolean {
  return getNextPerformer(currentRound, roundPlan, performances, characters) === null;
}

/**
 * 获取已表演的角色名称列表
 */
export function getPerformedCharNames(performances: Performance[], characters: Character[], round?: number): string[] {
  const roundPerfs = round ? performances.filter((p) => p.round === round) : performances;
  return roundPerfs.map((p) => {
    const char = characters.find((c) => c.id === p.character_id);
    return char?.name;
  }).filter(Boolean) as string[];
}

/**
 * 根据角色名找到角色对象
 */
export function findCharacterByName(name: string, characters: Character[]): Character | undefined {
  return characters.find((c) => c.name === name);
}