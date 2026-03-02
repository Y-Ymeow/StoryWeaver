/**
 * 演出轮次规则模块
 */

import type { Character, Performance } from "@/stores";

/**
 * 表演回合（一次表演）
 */
export interface PerformanceTurn {
  characterId: string;
  characterName: string;
  isUser: boolean;
  types: string[];  // 内容类型：dialogue/action/thought/emotion
  lineHint?: string;  // 台词建议/要点（一句话总结该说什么）
}

/**
 * 轮次计划（一场戏）
 */
export interface RoundPlanItem {
  round: number;
  description: string;  // 本轮剧情描述
  goal?: string;  // 本轮小目标
  turns: PerformanceTurn[];  // 多个表演回合
}

/**
 * 兼容旧版 Performer 类型
 */
export interface Performer {
  characterId: string;
  characterName: string;
  isUser: boolean;
  types: string[];
  lineHint?: string;
  isTemp?: boolean;  // 是否是临时角色
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
  
  // 获取已表演的角色名称列表
  const performedCharNames = currentRoundPerfs.map((p) => {
    const char = characters.find((c) => c.id === p.character_id);
    return char?.name;
  }).filter(Boolean);

  // 兼容旧版数据结构（performances 字段）和新版（turns 字段）
  const turns = (currentRoundPlan as any)?.turns || (currentRoundPlan as any)?.performances || [];
  
  if (currentRoundPlan && turns.length > 0) {
    // 按顺序找第一个还没表演的
    for (const performer of turns) {
      if (!performedCharNames.includes(performer.characterName || performer.characterId)) {
        return {
          characterId: performer.characterId,
          characterName: performer.characterName,
          isUser: performer.isUser,
          types: performer.types,
          lineHint: performer.lineHint,
          isTemp: performer.isTemp,
        };
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