/**
 * 场景编辑器相关的 Prompt 模板
 */

import type { Room, Character } from "@/stores";

/**
 * 场景生成系统提示
 */
export function getSceneSystemPrompt(): string {
  return `你是一个专业的互动剧本场景设计师。请根据用户描述和故事背景生成 1-3 个剧本场景。

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
}

/**
 * 构建场景生成 Prompt
 */
export function buildScenePrompt(
  room: Room,
  characters: Character[],
  userPrompt: string,
  sceneSummaries?: { name: string; summary: string }[]
): string {
  const contextInfo = `
【故事背景】
- 名称：${room.name}
- 设定：${room.setting}
- 剧情大纲：${room.plot_summary || "未设置"}
- 世界观：${room.worldview || "未设置"}
- 基调：${room.tone || "未设置"}

【角色阵容】
${characters.map(c => `- ${c.name}: ${c.background || "无背景"} (${c.dialogue_style || "普通"}风格)`).join("\n")}
`;

  let previousScenesInfo = "";
  if (sceneSummaries && sceneSummaries.length > 0) {
    previousScenesInfo = `
【已完成场景摘要】
${sceneSummaries.map(s => `### ${s.name}\n${s.summary}`).join("\n\n")}
`;
  }

  return `${contextInfo}
${previousScenesInfo}
【用户需求】
${userPrompt}

请根据以上信息生成合适的场景。${previousScenesInfo ? "注意新场景要与已有剧情连贯。" : ""}`;
}

/**
 * 轮次计划系统提示
 */
export function getRoundPlanSystemPrompt(): string {
  return `你是专业的戏剧导演。请为互动剧本设计演出计划，考虑戏剧节奏和角色平衡。

请返回严格的 JSON 格式：
{
  "rounds": [
    {
      "round": 1,
      "description": "第一场戏的剧情描述",
      "performances": [
        {
          "characterId": "角色 ID",
          "characterName": "角色名称",
          "isUser": true/false,
          "types": ["dialogue", "action"]
        }
      ]
    }
  ]
}`;
}

/**
 * 构建轮次计划 Prompt
 */
export function buildRoundPlanPrompt(
  room: Room,
  characters: Character[],
  scene: { name: string; description: string; goal: string; maxRounds: number }
): string {
  const userChars = characters.filter((c) => c.is_user);
  const aiChars = characters.filter((c) => !c.is_user);

  return `
【剧本信息】
- 名称：${room.name}
- 设定：${room.setting}
- 世界观：${room.worldview || "未设置"}
- 基调：${room.tone || "未设置"}

【当前场景】
- 名称：${scene.name}
- 描述：${scene.description}
- 目标：${scene.goal || "推进剧情"}
- 总场次：${scene.maxRounds} 场

【出场角色】（只使用这些角色，不要让其他角色出场）
- 用户扮演：${userChars.map(c => c.name).join(', ') || "无"}
- AI 角色：${aiChars.map((c) => `${c.name} (${c.background || "无背景"})`).join(', ')}

请为这个场景设计${scene.maxRounds}场演出计划。

⚠️ 重要规则：
1. 每场戏只使用【出场角色】列表中的人物，不要添加其他角色
2. 合理安排用户角色和 AI 角色的出场顺序，让剧情有起承转合
3. 不是每个角色都要在每场戏中出现，根据剧情需要安排
4. 每场戏的描述要简洁明了，说明剧情发展

返回 JSON 格式：
{
  "rounds": [
    {
      "round": 1,
      "description": "第一场戏的剧情描述",
      "performances": [
        {
          "characterId": "角色 ID",
          "characterName": "角色名称",
          "isUser": true/false,
          "types": ["dialogue", "action"]
        }
      ]
    }
  ]
}
`;
}
