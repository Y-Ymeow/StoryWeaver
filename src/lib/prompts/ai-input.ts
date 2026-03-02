/**
 * AIInputConfig 相关的 Prompt 模板
 */

export type AIInputMode = "room" | "character" | "scene" | "custom";

export interface RoomContext {
  name?: string;
  setting?: string;
  plot_summary?: string;
  worldview?: string;
}

export interface CharacterContext {
  name: string;
  background: string;
  dialogue_style: string;
}

export interface SceneContext {
  name: string;
  description: string;
  goal: string;
}

/**
 * 构建 AI 输入的完整 prompt
 */
export function buildAIInputPrompt(
  prompt: string,
  keywords: string,
  mode: AIInputMode = "custom",
  count?: number,
): string {
  let result = prompt;
  if ((mode === "character" || mode === "scene") && count && count > 0) {
    result = `请生成 ${count} 个${mode === "character" ? "角色" : "场景"}。\n${result}`;
  }
  if (keywords) result += `\n\n关键词：${keywords}`;
  return result;
}

/**
 * 获取系统提示词
 */
export function getSystemPrompt(
  mode: AIInputMode,
  roomContext?: RoomContext,
  characters?: CharacterContext[],
  scenes?: SceneContext[],
): string {
  const contextInfo = roomContext
    ? `
【故事背景】
- 名称：${roomContext.name || "未设置"}
- 设定：${roomContext.setting || "未设置"}
- 剧情大纲：${roomContext.plot_summary || "未设置"}
- 世界观：${roomContext.worldview || "未设置"}
`
    : "";

  const charactersInfo =
    characters && characters.length > 0
      ? `
【已创建的角色】
${characters
  .map(
    (c, i: number) =>
      `${i + 1}. ${c.name} - ${c.background || "无背景"} (${c.dialogue_style || "普通"}风格)`,
  )
  .join("\n")}
`
      : "";

  const scenesInfo =
    scenes && scenes.length > 0
      ? `
【已创建的场景】
${scenes
  .map(
    (s, i: number) => `${i + 1}. ${s.name} - ${s.description || "无描述"}`,
  )
  .join("\n")}
`
      : "";

  switch (mode) {
    case "room":
      return `你是一个专业的互动剧本创作助手。请根据用户描述生成一个完整的剧本房间设定。

请返回严格的 JSON 格式：
{
  "name": "剧本名称",
  "setting": "基本设定（200 字以内，描述故事背景）",
  "plot_summary": "剧情大纲（300 字以内，描述主要剧情发展）",
  "worldview": "世界观设定（故事发生的世界背景）",
  "tone": "基调（如：轻松、悬疑、悲伤等）"
}

只返回 JSON，不要有其他内容。`;
    case "character":
      return `你是一个专业的互动剧本角色设计师。请根据用户描述和故事背景生成多个剧本角色，数量以用户要求为准。
${contextInfo}${charactersInfo}
请返回严格的 JSON 格式：
{
  "characters": [
    {
      "name": "角色名称",
      "background": "角色背景（100 字以内，需要与故事背景相关联）",
      "dialogue_style": "台词风格（如：古风、现代、幽默等）",
      "is_user": false
    }
  ]
}

只返回 JSON，不要有其他内容。`;
    case "scene":
      return `你是一个专业的互动剧本场景设计师。请根据用户描述和故事背景生成多个剧本场景，数量以用户要求为准。
${contextInfo}${scenesInfo}
请返回严格的 JSON 格式：
{
  "scenes": [
    {
      "name": "场景名称",
      "description": "场景描述（100 字以内）",
      "goal": "场景目标（需要完成的剧情任务）",
      "setup": "场景布置（道具、特殊元素等）",
      "max_rounds": 10
    }
  ]
}

只返回 JSON，不要有其他内容。`;
    default:
      return "你是一个有用的 AI 助手。";
  }
}
