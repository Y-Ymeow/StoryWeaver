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
5. 为每个表演回合添加"台词建议"，用一句话提示该角色该说什么/做什么

⚠️ 对话设计原则（重要）：
- **不要机械地一人一句轮流**！要根据实际情境设计
- 有些场景可能一个人连续说多句（如：解释、倾诉、争吵）
- 有些场景可能有多人插话、打断
- 有些场景可能有沉默、动作表演
- 根据情绪和剧情需要，合理安排谁先说、谁说多、谁后说

⚠️ 临时角色支持：
- 如果场景需要（如餐厅、商店、街道等），可以添加临时角色
- 临时角色示例：服务员、店员、保安、司机、路人、同事等
- 临时角色设置："isTemp": true，不需要在【出场角色】列表中

⚠️ 台词建议格式（重要）：
- ❌ 错误：写成具体台词，如"举起手电照向广场中心，眉头紧锁：'看，那边有矿石'"
- ✅ 正确：写成方向提示，如"发现可疑痕迹，提醒同伴注意"
- ✅ 正确：写成情绪/意图，如"表达担忧，建议离开这里"
- 台词建议应该简短（10-20 字），只说明**说话目的/情绪/方向**，不要写具体台词

请返回严格的 JSON 格式：
{
  "rounds": [
    {
      "round": 1,
      "description": "第一场戏的剧情描述",
      "goal": "本场小目标（可选）",
      "turns": [
        {
          "characterId": "角色 ID",
          "characterName": "角色名称",
          "isUser": true/false,
          "isTemp": true/false,  // 是否是临时角色（如服务员、路人等）
          "types": ["dialogue", "action"],
          "lineHint": "方向性提示，如：发现可疑痕迹，提醒同伴注意"
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
【出场角色】（主要角色，这些角色会在多场戏中出现）
- 用户扮演：${userChars.map(c => c.name).join(', ') || "无"}
- AI 角色：${aiChars.map((c) => `${c.name} (${c.background || "无背景"})`).join(', ')}

请为这个场景设计${scene.maxRounds}场演出计划。

⚠️ 重要规则：
1. **必须围绕场景目标**：每场戏都要服务于场景目标，不能偏离
2. **主要角色**：使用【出场角色】列表中的角色，他们会在多场戏中出现
3. **临时角色**（重要）：
   - 如果场景需要，可以添加临时角色（如：餐厅的服务员、商店的店员、大楼保安、出租车司机、路人等）
   - 临时角色只在该场戏中出现，不需要在【出场角色】列表中
   - 设置方法："isTemp": true, "characterName": "服务员/店员/保安..."
4. **对话设计要自然**（非常重要）：
   - ❌ 不要机械地一人一句轮流
   - ✅ 根据情境设计：谁先开口、谁回应、谁打断、谁沉默
   - ✅ 情绪激动时可能一个人连续说多句
   - ✅ 弱势角色可能说话少，强势角色可能主导对话
   - ✅ 有些轮次可能只有动作/表情，没有对话
5. **剧情递进**：
   - 第 1 场：铺垫/引入，建立情境
   - 中间场：发展/冲突，逐步推进
   - 最后一场：高潮/收尾，达成场景目标
6. **描述具体**：每场戏的描述要说明具体的剧情发展和该场的小目标
7. **台词建议**：为每个表演回合添加"lineHint"字段，用**方向性提示**说明该角色该说什么
   - ❌ 错误："举起手电照向广场中心，眉头紧锁：'看，那边有矿石'"（太具体）
   - ✅ 正确："发现可疑痕迹，提醒同伴注意"（方向提示）
   - ✅ 正确："试探对方身份，但不要直接问"（意图说明）
   - ✅ 正确："表达担忧，建议离开这里"（情绪/建议）
   - 台词建议应简短（10-20 字），只说明目的/情绪/方向，让演员自由发挥

返回 JSON 格式：
{
  "rounds": [
    {
      "round": 1,
      "description": "第一场戏的剧情描述（要体现该场的剧情发展和小目标）",
      "goal": "本场小目标（可选）",
      "turns": [
        {
          "characterId": "角色 ID",
          "characterName": "角色名称",
          "isUser": true/false,
          "isTemp": true/false,  // 是否是临时角色（服务员、店员、保安、路人等）
          "types": ["dialogue", "action"],
          "lineHint": "一句话台词建议"
        }
      ]
    }
  ]
}
`;
}
