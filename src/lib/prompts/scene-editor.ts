/**
 * 场景编辑器相关的 Prompt 模板
 */

import type { Room, Character } from "@/stores";

/**
 * 场景生成系统提示
 */
export function getSceneSystemPrompt(): string {
  return `你是资深互动戏剧编剧与分场导演。

任务：根据用户需求生成 1-3 个“可直接演出”的场景。

硬性要求：
1. 仅输出合法 JSON，不要 markdown、解释或注释。
2. 场景必须有推进性：每个场景都要推动关系/信息/冲突中的至少一个。
3. 避免空泛词（如“气氛紧张”）而没有具体事件；描述要包含可观察动作或变化。
4. max_rounds 必须是 5-10 的整数。
5. 名称要可区分，不要“场景一/场景二”这类占位名。

JSON 格式：
{
  "scenes": [{
    "name": "场景名称",
    "description": "场景描述（80字以内，包含具体事件）",
    "goal": "该场景要达成的叙事结果（30字以内）",
    "setup": "场景布置与关键道具（50字以内）",
    "max_rounds": 6
  }]
}`;
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
  let context = `【剧本名】${room.name}\n`;
  context += `【世界观与设定】${room.setting || "无"}\n`;
  context += `【剧情总览】${room.plot_summary || "无"}\n`;
  context += `【风格基调】${room.tone || "无"}\n`;

  if (sceneSummaries && sceneSummaries.length > 0) {
    context += `【前情已发生】\n${sceneSummaries.map((s) => `- ${s.name}：${s.summary}`).join("\n")}\n`;
  }

  context += `【可用角色】\n${characters.map((c) => `- ${c.name}${c.background ? `：${c.background}` : ""}`).join("\n") || "- 无"}\n`;
  context += `【用户需求】${userPrompt}\n`;
  context += `【生成偏好】优先生成冲突明确、可连续演出的场景，且与前情衔接自然。`;
  
  return context;
}

/**
 * 轮次计划系统提示
 */
export function getRoundPlanSystemPrompt(): string {
  return `你是互动戏剧导演。请把场景拆成可执行的轮次计划。

硬性要求：
1. 仅输出合法 JSON，不要 markdown、解释或注释。
2. 每一轮必须有“剧情变化点”（信息新增、关系变化、冲突升级、目标推进其一）。
3. turns 顺序要自然，不要机械轮流；允许同一角色连续两次发言。
4. lineHint 只能写“表达意图/策略”，不要写具体台词原句。
5. 如需临时角色，必须写 isTemp=true，characterId 以 temp_ 开头。
6. 当可用角色>=2时：每轮必须 2-4 个 turn；至少 40% 的轮次要有 3-4 个 turn。
7. 禁止全程“一人一句”对称结构（如 A-B-A-B 重复）；必须出现打断/追问/连说等非对称互动。

JSON 格式：
{
  "rounds": [{
    "round": 1,
    "description": "本轮会发生什么（30字以内）",
    "goal": "本轮小目标（可选）",
    "turns": [{
      "characterId": "角色 ID",
      "characterName": "角色名称",
      "isUser": true,
      "isTemp": false,
      "types": ["dialogue"],
      "lineHint": "表达意图/策略，不是具体台词"
    }]
  }]
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
    keywordsHint = `\n【关键词】${keywords.join('、')}\n`;
  }

  return `【剧本】${room.name}
【世界观】${room.setting || "无"}
【剧情总览】${room.plot_summary || "无"}
【场景】${scene.name}：${scene.description || "无"}
【场景目标】${scene.goal || "推进剧情"}
【需要生成轮次】${scene.maxRounds} 场
【用户角色】${userChars.map((c) => c.name).join(", ") || "无"}
【AI角色】${aiChars.map((c) => c.name).join(", ") || "无"}
${keywordsHint}
请设计 ${scene.maxRounds} 场演出计划。

重要规则：
1. 每轮必须有明确变化点，不能只是重复确认信息
2. 强化因果：上一轮结果应影响下一轮行动
3. 互动要像拍戏排练：同一轮内要有来回推进，不是每人只说一句
4. 允许沉默、打断、转移话题，不要机械对称；避免固定 ABAB 模式
5. 当场上角色>=2时，每轮 turns 控制在 2-4；其中至少 40% 轮次为 3-4 turns
6. 至少设计 1 轮“冲突升级”或“误解加深”的高张力互动
7. 临时角色仅在必要时引入，并推动剧情
8. lineHint 用于“方向提示”，不是台词成品
9. 总体节奏：前期铺垫，中段升级，末段收束或留下钩子

JSON 格式：
{
  "rounds": [{
    "round": 1,
    "description": "第一场戏的剧情描述",
    "goal": "本场小目标（可选）",
    "turns": [
      {
        "characterId": "ID_A",
        "characterName": "角色A",
        "isUser": true/false,
        "isTemp": false,
        "types": ["dialogue"],
        "lineHint": "先试探，不暴露底牌"
      },
      {
        "characterId": "ID_B",
        "characterName": "角色B",
        "isUser": true/false,
        "isTemp": false,
        "types": ["dialogue", "action"],
        "lineHint": "打断对方并施压"
      },
      {
        "characterId": "ID_A",
        "characterName": "角色A",
        "isUser": true/false,
        "isTemp": false,
        "types": ["dialogue"],
        "lineHint": "改口并转移话题争取时间"
      }
    ]
  }]
}`;
}
