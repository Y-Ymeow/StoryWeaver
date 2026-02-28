/**
 * 演出提示词模板
 */

import type { Room, Scene, Character, Performance } from "@/stores";

/**
 * 角色表演提示词
 */
export function buildCharacterPerformancePrompt(
  room: Room,
  scene: Scene,
  character: Character,
  allCharacters: Character[],
  performances: Performance[],
  roundNum: number
): string {
  const recentHistory = performances
    .slice(-5)
    .map((p) => {
      const char = allCharacters.find((c) => c.id === p.character_id);
      return `- ${char?.name}: ${p.content}`;
    })
    .join("\n");

  return `【角色】${character.name}
【背景】${character.background || "无"}
【台词风格】${character.dialogue_style || "普通"}
【当前场次】第${roundNum}轮
【场景】${scene.name} - ${scene.description || ""}
【前情提要】
${recentHistory || "这是第一轮"}

请为${character.name}生成表演内容。`;
}

/**
 * 角色表演系统提示
 */
export function getCharacterPerformanceSystemPrompt(): string {
  return "你是专业演员。根据角色设定和剧情生成符合角色性格的表演内容。";
}

/**
 * 场景摘要系统提示
 */
export function getSceneSummarySystemPrompt(): string {
  return `你是一个专业的剧本分析师。请根据给定的场景信息和演出记录，生成一个简洁的场景总结。
总结应该包括：
1. 场景的主要事件和发展
2. 角色之间的互动和关系变化
3. 场景目标是否达成
4. 关键转折点或高潮

请用中文回答，控制在200字以内。`;
}

/**
 * 构建场景摘要提示词
 */
export function buildSceneSummaryPrompt(
  scene: Scene,
  performances: Performance[],
  characters: Character[]
): string {
  // 构建演出历史
  const performanceHistory = performances.map(p => {
    const char = characters.find(c => c.id === p.character_id);
    let content = '';
    try {
      const parsed = typeof p.content === 'string' ? JSON.parse(p.content) : p.content;
      const parts: string[] = [];
      if (parsed.dialogue) parts.push(`对话: ${parsed.dialogue}`);
      if (parsed.action) parts.push(`动作: ${parsed.action}`);
      if (parsed.thought) parts.push(`心理: ${parsed.thought}`);
      if (parsed.emotion) parts.push(`情绪: ${parsed.emotion}`);
      content = parts.join(' | ');
    } catch {
      content = String(p.content);
    }
    return `[第${p.round}轮] ${char?.name || '未知'}: ${content}`;
  }).join('\n');

  return `场景名称：${scene.name}
场景描述：${scene.description || '无'}
场景目标：${scene.goal || '无'}

演出记录：
${performanceHistory}

请生成这个场景的总结：`;
}
