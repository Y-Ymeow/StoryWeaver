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

⚠️ 重要原则：
1. 每场戏必须围绕【场景目标】展开，不能偏离
2. 剧情要有起承转合，逐步推进到场景目标
3. 第一场戏通常是铺垫/引入，最后一场戏是高潮/收尾
4. 每场戏的描述要具体说明该场的剧情发展和目标

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
 * @param keywords 可选的关键词数组，用于指导每轮的剧情方向
 */
export function buildRoundPlanPrompt(
  room: Room,
  characters: Character[],
  scene: { name: string; description: string; goal: string; maxRounds: number },
  keywords?: string[]
): string {
  const userChars = characters.filter((c) => c.is_user);
  const aiChars = characters.filter((c) => !c.is_user);

  // 构建关键词提示
  let keywordsHint = "";
  if (keywords && keywords.length > 0) {
    keywordsHint = `
【关键词指引】
用户提供了以下关键词，请在对应的轮次中体现这些剧情元素：
${keywords.map((k, i) => `- 第${i + 1}场：${k}`).join("\n")}

注意：关键词是剧情方向的提示，请将其融入到每场戏的描述中。
`;
  }

  return `
【剧本信息】
- 名称：${room.name}
- 设定：${room.setting}
- 世界观：${room.worldview || "未设置"}
- 基调：${room.tone || "未设置"}

【当前场景】
- 名称：${scene.name}
- 描述：${scene.description}
- 目标：**${scene.goal || "推进剧情"}**
- 总场次：${scene.maxRounds} 场
${keywordsHint}
【出场角色】（只使用这些角色，不要让其他角色出场）
- 用户扮演：${userChars.map(c => c.name).join(', ') || "无"}
- AI 角色：${aiChars.map((c) => `${c.name} (${c.background || "无背景"})`).join(', ')}

请为这个场景设计${scene.maxRounds}场演出计划。

⚠️ 重要规则：
1. **必须围绕场景目标**：每场戏都要服务于场景目标，不能偏离
2. **只使用出场角色**：不要添加【出场角色】列表之外的人物
3. **合理安排顺序**：用户角色和 AI 角色的出场顺序要符合对话逻辑
4. **剧情递进**：
   - 第 1 场：铺垫/引入，建立情境
   - 中间场：发展/冲突，逐步推进
   - 最后一场：高潮/收尾，达成场景目标
5. **描述具体**：每场戏的描述要说明具体的剧情发展和该场的小目标

返回 JSON 格式：
{
  "rounds": [
    {
      "round": 1,
      "description": "第一场戏的剧情描述（要体现该场的剧情发展和小目标）",
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
