/**
 * 记忆库处理模块
 *
 * 负责管理角色记忆和剧本总结的生成与更新
 */

import { createClient } from "@/providers";
import type { Character, Room, Scene, Performance } from "@stores";
import type { ProviderConfig } from "@/stores/types";
import {
  buildSceneSummaryPrompt,
  getSceneSummarySystemPrompt,
} from "../prompts";

/**
 * 记忆类型
 */
export interface Memory {
  // 记忆内容
  content: string;
  // 记忆类型
  type: "character" | "scene" | "room";
  // 关联 ID
  targetId: string;
  // 创建时间
  createdAt: number;
  // 摘要
  summary?: string;
}

/**
 * 生成角色记忆
 *
 * 基于角色的历史演出记录生成记忆摘要
 */
export async function generateCharacterMemory(
  character: Character,
  performances: Performance[],
  scene: Scene,
  roomSummary?: string,
): Promise<string> {
  // 获取该角色的所有演出记录
  const characterPerformances = performances.filter(
    (p) => p.character_id === character.id,
  );

  if (characterPerformances.length === 0) {
    return character.memory || "";
  }

  // 构建记忆内容
  const memoryParts: string[] = [];

  // 场景信息
  memoryParts.push(`【当前场景】${scene.name}`);
  if (scene.summary) {
    memoryParts.push(`【场景总结】${scene.summary}`);
  }

  // 角色背景
  if (character.background) {
    memoryParts.push(`【角色背景】${character.background}`);
  }

  // 演出历史摘要 - 解析 JSON 内容获取对话
  const dialogueHistory = characterPerformances
    .map((p) => {
      try {
        const content = JSON.parse(p.content);
        return (
          content.dialogue ||
          content.action ||
          content.thought ||
          content.emotion ||
          p.content
        );
      } catch {
        return p.content;
      }
    })
    .slice(-10); // 保留最近 10 条对话

  if (dialogueHistory.length > 0) {
    memoryParts.push(`【最近对话】${dialogueHistory.join(" | ")}`);
  }

  // 行动历史 - 解析 JSON 内容获取动作
  const actionHistory = characterPerformances
    .map((p) => {
      try {
        const content = JSON.parse(p.content);
        return content.action || "";
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .slice(-5); // 保留最近 5 条行动

  if (actionHistory.length > 0) {
    memoryParts.push(`【最近行动】${actionHistory.join(" | ")}`);
  }

  // 情绪历史 - 解析 JSON 内容获取情绪
  const emotionHistory = characterPerformances
    .map((p) => {
      try {
        const content = JSON.parse(p.content);
        return content.emotion || "";
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .slice(-3); // 保留最近 3 条情绪

  if (emotionHistory.length > 0) {
    memoryParts.push(`【情绪状态】${emotionHistory.join(" → ")}`);
  }

  // 剧本全局总结
  if (roomSummary) {
    memoryParts.push(`【剧本进展】${roomSummary}`);
  }

  return memoryParts.join("\n");
}

/**
 * 生成场景总结
 */
export async function generateSceneSummary(
  scene: Scene,
  performances: Performance[],
  characters: Character[],
  modelConfig?: {
    provider: ProviderConfig;
    model: string;
  },
): Promise<string> {
  if (performances.length === 0) {
    return scene.summary || "";
  }

  try {
    let provider = modelConfig?.provider;
    let model = modelConfig?.model;

    // 优先使用当前演出已选模型；没有则回退到激活 provider
    if (!provider || !model) {
      const providersData = localStorage.getItem("ai-providers");
      if (!providersData) {
        return generateBasicSummary(scene, performances, characters);
      }

      const providers = JSON.parse(providersData);
      const activeProvider = providers.find((p: any) => p.is_active);
      if (!activeProvider) {
        return generateBasicSummary(scene, performances, characters);
      }

      provider = activeProvider;
      model = activeProvider.custom_models?.[0] || activeProvider.model;
    }

    if (!provider || !model) {
      return generateBasicSummary(scene, performances, characters);
    }

    const client = createClient(provider);

    const messages = [
      { role: "system", content: getSceneSummarySystemPrompt() },
      {
        role: "user",
        content: buildSceneSummaryPrompt(scene, performances, characters),
      },
    ];

    let summary = "";
    const stream = client.chatStream(messages, {
      temperature: 0.7,
      max_tokens: 500,
      model,
    });
    for await (const chunk of stream) {
      summary += chunk.content;
    }

    return (
      summary.trim() || generateBasicSummary(scene, performances, characters)
    );
  } catch (error) {
    console.error("AI 生成摘要失败:", error);
    return generateBasicSummary(scene, performances, characters);
  }
}

/**
 * 生成基础摘要（作为 fallback）
 */
function generateBasicSummary(
  scene: Scene,
  performances: Performance[],
  characters: Character[],
): string {
  const summaryParts: string[] = [];

  summaryParts.push(`场景：${scene.name}`);
  if (scene.goal) {
    summaryParts.push(`目标：${scene.goal}`);
  }

  const involvedCharacters = characters.filter((c) =>
    performances.some((p) => p.character_id === c.id),
  );
  if (involvedCharacters.length > 0) {
    summaryParts.push(
      `参与角色：${involvedCharacters.map((c) => c.name).join(", ")}`,
    );
  }

  const maxRound = Math.max(...performances.map((p) => p.round));
  summaryParts.push(`总轮次：${maxRound}`);
  summaryParts.push(`总记录数：${performances.length}`);

  let dialogueCount = 0;
  let actionCount = 0;
  for (const perf of performances) {
    try {
      const content =
        typeof perf.content === "string"
          ? JSON.parse(perf.content)
          : perf.content;
      if (content.dialogue) dialogueCount++;
      if (content.action) actionCount++;
    } catch {
      dialogueCount++;
    }
  }

  summaryParts.push(`对话：${dialogueCount}条，行动：${actionCount}条`);

  return summaryParts.join(" | ");
}

/**
 * 生成剧本全局总结
 */
export async function generateRoomSummary(
  room: Room,
  scenes: Scene[],
  sceneSummaries: { sceneId: string; summary: string }[],
): Promise<string> {
  const summaryParts: string[] = [];

  summaryParts.push(`剧本：${room.name}`);

  if (room.plot_summary) {
    summaryParts.push(`大纲：${room.plot_summary}`);
  }

  // 各场景进展
  const completedScenes = sceneSummaries.filter((s) => s.summary);
  if (completedScenes.length > 0) {
    summaryParts.push("已完成的场景:");
    completedScenes.forEach((s) => {
      summaryParts.push(`  - ${s.summary}`);
    });
  }

  // 当前进度
  const totalScenes = scenes.length;
  const progress =
    completedScenes.length > 0
      ? `${completedScenes.length}/${totalScenes}`
      : `${totalScenes}个场景待进行`;

  summaryParts.push(`进度：${progress}`);

  return summaryParts.join("\n");
}

/**
 * 解析 AI 输出的多部分内容
 *
 * AI 返回的格式：[message: xxx][action: xxx][thought: xxxx][emotion: xxx]
 */
export function parseAIMultiContent(content: string): Array<{
  type: Performance["type"];
  content: string;
}> {
  const results: Array<{ type: Performance["type"]; content: string }> = [];

  // 正则匹配 [type: content] 格式
  const pattern = /\[(\w+):\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const [, typeStr, text] = match;
    const type = mapTypeString(typeStr.toLowerCase());
    if (type) {
      results.push({ type, content: text.trim() });
    }
  }

  // 如果没有匹配到格式，整个内容作为对话
  if (results.length === 0 && content.trim()) {
    results.push({ type: "dialogue", content: content.trim() });
  }

  return results;
}

/**
 * 映射类型字符串到 Performance 类型
 */
function mapTypeString(typeStr: string): Performance["type"] | null {
  const typeMap: Record<string, Performance["type"]> = {
    message: "dialogue",
    dialogue: "dialogue",
    dialog: "dialogue",
    action: "action",
    behavior: "behavior",
    thought: "thought",
    emotion: "emotion",
    emotion_state: "emotion",
  };

  return typeMap[typeStr] || null;
}

/**
 * 构建记忆上下文用于 AI 请求
 */
export function buildMemoryContext(
  character: Character,
  scene: Scene,
  room: Room,
  recentPerformances: Performance[],
): string {
  const contextParts: string[] = [];

  // 世界观和基调
  if (room.worldview) {
    contextParts.push(`世界观：${room.worldview}`);
  }
  if (room.tone) {
    contextParts.push(`基调：${room.tone}`);
  }

  // 场景信息
  contextParts.push(`\n【当前场景】`);
  contextParts.push(`名称：${scene.name}`);
  if (scene.description) {
    contextParts.push(`描述：${scene.description}`);
  }
  if (scene.setup) {
    contextParts.push(`布置：${scene.setup}`);
  }
  if (scene.goal) {
    contextParts.push(`目标：${scene.goal}`);
  }

  // 角色信息
  contextParts.push(`\n【你的角色】`);
  contextParts.push(`名字：${character.name}`);
  if (character.background) {
    contextParts.push(`背景：${character.background}`);
  }
  if (character.dialogue_style) {
    contextParts.push(`台词风格：${character.dialogue_style}`);
  }
  if (character.memory) {
    contextParts.push(`记忆：${character.memory}`);
  }

  // 最近对话历史
  if (recentPerformances.length > 0) {
    contextParts.push(`\n【最近剧情】`);
    recentPerformances.slice(-5).forEach((p) => {
      const typeLabel = getTypeLabel(p.primary_type);
      contextParts.push(`${typeLabel}: ${p.content}`);
    });
  }

  return contextParts.join("\n");
}

/**
 * 获取类型的中文标签
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dialogue: "对话",
    action: "动作",
    thought: "心理",
    emotion: "情绪",
    behavior: "行为",
  };
  return labels[type] || type;
}
