/**
 * Prompt 模板库
 *
 * 包含各种 AI 请求使用的 prompt 模板
 */

import type { Character, Scene, Room, Performance } from "@stores";

/**
 * 系统提示词模板
 */
export const SYSTEM_PROMPTS = {
  // 通用剧本助手
  general: `你是一位专业的剧本创作助手，擅长帮助创作互动剧本。
你需要扮演剧本中的角色，根据角色设定和剧情发展生成合适的对话、动作、心理活动和情绪表现。

输出格式说明：
- 使用 [message: 内容] 表示对话
- 使用 [action: 内容] 表示动作
- 使用 [thought: 内容] 表示心理活动
- 使用 [emotion: 内容] 表示情绪状态

你可以根据需要组合多种输出类型，让角色表现更加生动。`,

  // 角色扮演模式
  roleplay: `你正在参与一个互动剧本的演出。
请严格遵循角色设定，保持角色性格的一致性。
根据场景目标和剧情发展，自然地推进故事。

记住：
1. 保持角色的一致性
2. 积极响应其他角色的互动
3. 推动剧情向场景目标发展
4. 使用丰富的表现方式（对话、动作、心理、情绪）`,

  // 剧本生成模式
  generation: `你是一位创意剧本作家，擅长生成有趣的剧情内容。
请根据提供的设定生成符合要求的剧本内容。

要求：
1. 剧情连贯有逻辑
2. 角色性格鲜明
3. 对话自然流畅
4. 情节有吸引力`,
};

/**
 * 生成角色扮演的 prompt
 */
export function generateRoleplayPrompt(
  character: Character,
  scene: Scene,
  room: Room,
  context: string,
  recentPerformances: Performance[],
  orderInfo?: {
    currentRound: number;
    characterOrder: number;
    totalCharacters: number;
  },
): string {
  const parts: string[] = [];

  // 基础设定
  parts.push(`## 剧本信息`);
  parts.push(`剧本名称：${room.name}`);
  if (room.worldview) {
    parts.push(`世界观：${room.worldview}`);
  }
  if (room.tone) {
    parts.push(`基调：${room.tone}`);
  }

  // 场景信息
  parts.push(`\n## 当前场景`);
  parts.push(`场景名称：${scene.name}`);
  if (scene.description) {
    parts.push(`场景描述：${scene.description}`);
  }
  if (scene.setup) {
    parts.push(`场景布置：${scene.setup}`);
  }
  if (scene.goal) {
    parts.push(`场景目标：${scene.goal}`);
  }

  // 角色信息
  parts.push(`\n## 你的角色`);
  parts.push(`角色名称：${character.name}`);
  if (character.background) {
    parts.push(`角色背景：${character.background}`);
  }
  if (character.dialogue_style) {
    parts.push(`台词风格：${character.dialogue_style}`);
  }
  if (character.memory) {
    parts.push(`当前记忆：${character.memory}`);
  }

  // 演出顺序信息
  if (orderInfo) {
    parts.push(`\n## 演出顺序`);
    parts.push(`当前轮次：第${orderInfo.currentRound}轮`);
    parts.push(`你的顺序：第${orderInfo.characterOrder}位`);
    parts.push(`本轮共${orderInfo.totalCharacters}个角色`);
    parts.push(`请根据顺序进行表演，如果是最后一位，请考虑是否推进到下一轮`);
  }

  // 上下文（最近的演出记录）
  if (recentPerformances.length > 0) {
    parts.push(`\n## 最近的演出`);
    recentPerformances.forEach((p) => {
      // 解析 JSON 内容
      let contentText = p.content;
      let types: string[] = [];
      try {
        const content = JSON.parse(p.content);
        const parts: string[] = [];
        if (content.dialogue) {
          parts.push(`对话：${content.dialogue}`);
          types.push("dialogue");
        }
        if (content.action) {
          parts.push(`动作：${content.action}`);
          types.push("action");
        }
        if (content.thought) {
          parts.push(`心理：${content.thought}`);
          types.push("thought");
        }
        if (content.emotion) {
          parts.push(`表情：${content.emotion}`);
          types.push("emotion");
        }
        contentText = parts.join(" | ") || p.content;
      } catch {}

      if (types.length > 0) {
        const typeLabels = types.map((t) => getTypeLabel(t as any)).join(", ");
        parts.push(`[${typeLabels}] ${contentText}`);
      } else {
        parts.push(`[对话] ${contentText}`);
      }
    });
  }

  // 上下文信息
  if (context) {
    parts.push(`\n## 额外信息`);
    parts.push(context);
  }

  // 输出要求
  parts.push(`\n## 输出要求`);
  parts.push(`请根据以上信息，以${character.name}的身份进行表演。`);
  parts.push(`使用以下格式输出（可组合多种类型）：`);
  parts.push(`[message: 对话内容]`);
  parts.push(`[action: 动作描述]`);
  parts.push(`[thought: 心理活动]`);
  parts.push(`[emotion: 情绪状态]`);

  return parts.join("\n");
}

/**
 * 生成场景总结的 prompt
 */
export function generateSceneSummaryPrompt(
  scene: Scene,
  performances: Performance[],
  characters: Character[],
): string {
  const parts: string[] = [];

  parts.push(`请为以下场景生成总结：`);
  parts.push(`\n## 场景信息`);
  parts.push(`名称：${scene.name}`);
  parts.push(`描述：${scene.description || "无"}`);
  parts.push(`目标：${scene.goal || "无"}`);

  parts.push(`\n## 参与角色`);
  characters.forEach((c) => {
    parts.push(`- ${c.name}: ${c.background || "无背景信息"}`);
  });

  parts.push(`\n## 演出记录`);
  performances.forEach((p, i) => {
    let contentText = p.content;
    let typeLabel = "对话";
    try {
      const content = JSON.parse(p.content);
      const parts: string[] = [];
      if (content.dialogue) {
        parts.push(`对话：${content.dialogue}`);
        typeLabel = "对话";
      }
      if (content.action) {
        parts.push(`动作：${content.action}`);
      }
      if (content.thought) {
        parts.push(`心理：${content.thought}`);
      }
      if (content.emotion) {
        parts.push(`表情：${content.emotion}`);
      }
      contentText = parts.join(" | ") || p.content;
    } catch {}
    parts.push(`${i + 1}. [轮次${p.round}] ${typeLabel}: ${contentText}`);
  });

  parts.push(`\n请生成一段简洁的场景总结，包括：`);
  parts.push(`1. 场景目标是否完成`);
  parts.push(`2. 关键剧情发展`);
  parts.push(`3. 角色的重要表现`);
  parts.push(`4. 为后续剧情的铺垫`);

  return parts.join("\n");
}

/**
 * 生成角色记忆的 prompt
 */
export function generateCharacterMemoryPrompt(
  character: Character,
  performances: Performance[],
  scene: Scene,
): string {
  const parts: string[] = [];

  parts.push(`请为角色"${character.name}"生成记忆摘要：`);
  parts.push(`\n## 角色信息`);
  parts.push(`背景：${character.background || "无"}`);
  parts.push(`台词风格：${character.dialogue_style || "无"}`);

  parts.push(`\n## 当前场景`);
  parts.push(`名称：${scene.name}`);
  parts.push(`描述：${scene.description || "无"}`);

  parts.push(`\n## 该角色的演出记录`);
  performances.forEach((p, i) => {
    let contentText = p.content;
    let typeLabel = "对话";
    try {
      const content = JSON.parse(p.content);
      const parts: string[] = [];
      if (content.dialogue) {
        parts.push(`对话：${content.dialogue}`);
        typeLabel = "对话";
      }
      if (content.action) {
        parts.push(`动作：${content.action}`);
      }
      if (content.thought) {
        parts.push(`心理：${content.thought}`);
      }
      if (content.emotion) {
        parts.push(`表情：${content.emotion}`);
      }
      contentText = parts.join(" | ") || p.content;
    } catch {}
    parts.push(`${i + 1}. [${typeLabel}] ${contentText}`);
  });

  parts.push(`\n请生成一段记忆摘要，帮助角色在后续场景中保持连贯性。`);
  parts.push(`包括：`);
  parts.push(`1. 角色在本场景的经历`);
  parts.push(`2. 与其他角色的关系变化`);
  parts.push(`3. 角色的情绪状态`);
  parts.push(`4. 需要记住的重要信息`);

  return parts.join("\n");
}

/**
 * 生成剧本创意的 prompt
 */
export function generateStoryIdeaPrompt(
  genre?: string,
  theme?: string,
  tone?: string,
): string {
  const parts: string[] = [];

  parts.push(`请生成一个互动剧本的创意构思：`);

  if (genre) {
    parts.push(`类型：${genre}`);
  } else {
    parts.push(`类型：不限（请推荐合适的类型）`);
  }

  if (theme) {
    parts.push(`主题：${theme}`);
  }

  if (tone) {
    parts.push(`基调：${tone}`);
  }

  parts.push(`\n请提供以下内容：`);
  parts.push(`1. 剧本名称（提供 3 个选项）`);
  parts.push(`2. 故事背景设定`);
  parts.push(`3. 主要角色设定（3-5 个角色）`);
  parts.push(`4. 剧情大纲（起承转合）`);
  parts.push(`5. 世界观设定`);
  parts.push(`6. 建议的场景数量和各场景目标`);

  return parts.join("\n");
}

/**
 * 生成角色设定的 prompt
 */
export function generateCharacterDesignPrompt(
  room: Room,
  role?: string,
  count: number = 1,
): string {
  const parts: string[] = [];

  parts.push(`请为剧本"${room.name}"设计角色：`);
  parts.push(`\n## 剧本设定`);
  parts.push(`剧情大纲：${room.plot_summary || "无"}`);
  parts.push(`世界观：${room.worldview || "无"}`);
  parts.push(`基调：${room.tone || "无"}`);

  if (role) {
    parts.push(`\n## 特定角色`);
    parts.push(`需要设计的角色：${role}`);
  }

  parts.push(`\n请设计${count}个角色，每个角色包括：`);
  parts.push(`1. 角色名称`);
  parts.push(`2. 年龄、性别、外貌特征`);
  parts.push(`3. 背景故事`);
  parts.push(`4. 性格特点`);
  parts.push(`5. 台词风格`);
  parts.push(`6. 在剧本中的作用`);
  parts.push(`7. 与其他角色的关系`);

  return parts.join("\n");
}

/**
 * 生成场景设计的 prompt
 */
export function generateSceneDesignPrompt(
  room: Room,
  sceneIndex?: number,
): string {
  const parts: string[] = [];

  parts.push(`请为剧本"${room.name}"设计场景：`);
  parts.push(`\n## 剧本设定`);
  parts.push(`剧情大纲：${room.plot_summary || "无"}`);
  parts.push(`世界观：${room.worldview || "无"}`);

  if (sceneIndex) {
    parts.push(`\n## 场景位置`);
    parts.push(`这是第${sceneIndex}个场景`);
  }

  parts.push(`\n请设计场景，包括：`);
  parts.push(`1. 场景名称`);
  parts.push(`2. 场景描述（环境、氛围）`);
  parts.push(`3. 场景目标（需要完成的剧情任务）`);
  parts.push(`4. 场景布置（道具、特殊元素）`);
  parts.push(`5. 参与的角色`);
  parts.push(`6. 建议的最大轮次`);
  parts.push(`7. 可能的剧情走向`);

  return parts.join("\n");
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
