/**
 * 构建场景轮次 prompt
 */
export function buildSceneRoundPrompt(
  room: any,
  scene: any,
  character: any,
  allCharacters: any[],
  performances: any[],
  roundNum: number,
  roundGoal?: string,
  lineHint?: string,  // 新增：台词建议
): string {
  // 获取最近历史（最多 3 轮）
  const maxRound = performances.length > 0 ? Math.max(...performances.map(p => p.round)) : 0;
  const recentRounds = Math.max(1, maxRound - 2);

  const recentHistory = performances
    .filter(p => p.round >= recentRounds)
    .map((p) => {
      const char = allCharacters.find((c) => c.id === p.character_id);
      let content = p.content;
      try {
        const parsed: any = JSON.parse(p.content);
        const parts: string[] = [];
        if (parsed.dialogue) parts.push(`${parsed.dialogue}`);
        if (parsed.action) parts.push(`（${parsed.action}）`);
        if (parsed.thought) parts.push(`（${parsed.thought}）`);
        if (parsed.emotion) parts.push(`（${parsed.emotion}）`);
        content = parts.join(" ") || p.content;
      } catch {}
      return `${char?.name}：${content}`;
    })
    .join("\n");

  const lineHintInfo = lineHint ? `\n\n## 💡 台词建议\n${lineHint}` : "";

  return `你正在扮演角色【${character.name}】进行即兴表演。

## 角色设定
- 姓名：${character.name}
- 背景：${character.background || "普通人物"}
- 台词风格：${character.dialogue_style || "自然口语"}

## 当前场景
- 场景：${scene.name}
- 描述：${scene.description || ""}
${scene.goal ? `- 场景目标：${scene.goal}` : ""}
- 当前：第 ${roundNum} 轮

## 🎯 本轮目标
${roundGoal || "根据剧情自然发展"}
${lineHintInfo}

## 近期演出
${recentHistory || "（这是第一轮）"}

## 表演要求（重要）
1. **自然真实**：像真实生活中一样说话做事，不要夸张
2. **精简为主**：对话 1-2 句，动作/心理/表情**选 1-2 个**即可，不要全写
3. **留白艺术**：不需要每次都表达完整，适当的沉默和简单反应更真实
4. **符合情境**：根据剧情氛围调整反应强度（日常对话平淡，关键时刻才有强烈情绪）
5. **避免重复**：不要重复使用相同的表情和动作描述
6. **参考台词建议**：如果有台词建议，请参考其方向进行表演，但不要生搬硬套

## 输出格式（可选的才写，不要硬凑）
💬 对话：（主要表达方式，1-2 句）
🎯 动作：（必要时才写，简单描述）
💭 心理：（必要时才写，简短内心活动）
❤️ 表情：（必要时才写，简单情绪）

**记住：好的表演是自然的，不是每个字段都要填满。**

现在请为【${character.name}】生成第 ${roundNum} 轮的表演内容：`;
}

export interface SceneDirectivePromptSpeaker {
  name: string;
  is_user: boolean;
  character_id: string;
  background?: string;
  dialogue_style?: string;
}

export function buildSceneDirectivePrompt(
  room: any,
  scene: any,
  characters: SceneDirectivePromptSpeaker[],
  performances: any[],
): string {
  const recentHistory = performances
    .slice(-12)
    .map((p) => {
      const char = characters.find((c) => c.character_id === p.character_id);
      let content = p.content;
      try {
        const parsed: any = JSON.parse(p.content);
        const parts: string[] = [];
        if (parsed.dialogue) parts.push(parsed.dialogue);
        if (parsed.action) parts.push(`动作:${parsed.action}`);
        if (parsed.thought) parts.push(`心理:${parsed.thought}`);
        if (parsed.emotion) parts.push(`情绪:${parsed.emotion}`);
        content = parts.join(" / ") || p.content;
      } catch {
        // ignore parse error
      }
      return `${char?.name || p.character_id}: ${content}`;
    })
    .join("\n");

  const charactersInfo = characters
    .map(
      (c) =>
        `- ${c.name} (${c.is_user ? "用户角色" : "AI角色"}) [id:${c.character_id}]，背景:${c.background || "普通人"}，说话风格:${c.dialogue_style || "自然口语"}`,
    )
    .join("\n");

  return `你是剧情导演，负责决定“下一步由谁说话、要做什么、场景状态如何变化”。
请只输出 JSON，不要输出多余解释。

## 场景信息
- 房间: ${room.name}
- 场景: ${scene.name}
- 描述: ${scene.description || ""}
- 核心目标: ${scene.goal || "自然推进剧情"}

## 可用角色
${charactersInfo || "（无）"}

## 最近剧情
${recentHistory || "（开场，暂无台词）"}

## 输出 JSON Schema（必须严格遵守）
{
  "should_end": false,
  "end_reason": "当 should_end=true 时给出结束原因",
  "speaker": {
    "mode": "existing|temp_user|temp_ai",
    "character_id": "existing 时必须填写已有 id；temp 可留空",
    "name": "说话者名字"
  },
  "task": "这一步该说话者要完成的动作/表达任务",
  "goal": "这一步的小目标",
  "scene_beat": "当前剧情推进点",
  "environment": "环境补充（时间/位置/氛围）",
  "line_hint": "一句话提示他这句大概怎么说",
  "suggested_types": ["dialogue", "action"]
}

约束：
1. 只安排“一步”，不要安排多轮。
2. 保持剧情自然、像剧本推进。
3. 可以使用临时角色（temp_user/temp_ai），但别滥用。
4. 如果是临时用户角色，name 必须具体（例如“记者小林”）。
5. suggested_types 只能从 dialogue/action/thought/emotion 里选 1-2 个。`;
}

export function buildSceneDirectivePerformancePrompt(
  room: any,
  scene: any,
  character: any,
  allCharacters: any[],
  performances: any[],
  directive: {
    goal?: string;
    task?: string;
    sceneBeat?: string;
    environment?: string;
    lineHint?: string;
    step?: number;
  },
): string {
  const recentHistory = performances
    .slice(-12)
    .map((p) => {
      const char = allCharacters.find((c) => c.id === p.character_id);
      let content = p.content;
      try {
        const parsed: any = JSON.parse(p.content);
        const parts: string[] = [];
        if (parsed.dialogue) parts.push(parsed.dialogue);
        if (parsed.action) parts.push(`（${parsed.action}）`);
        if (parsed.thought) parts.push(`（${parsed.thought}）`);
        if (parsed.emotion) parts.push(`（${parsed.emotion}）`);
        content = parts.join(" ") || p.content;
      } catch {
        // ignore parse error
      }
      return `${char?.name || p.character_id}：${content}`;
    })
    .join("\n");

  return `你正在扮演角色【${character.name}】进行即兴表演。

## 角色设定
- 姓名：${character.name}
- 背景：${character.background || "普通人物"}
- 台词风格：${character.dialogue_style || "自然口语"}

## 当前场景
- 场景：${scene.name}
- 描述：${scene.description || ""}
- 核心目标：${scene.goal || "自然推进剧情"}
- 当前步骤：${directive.step || 1}
- 当前剧情点：${directive.sceneBeat || "自然推进"}
- 环境信息：${directive.environment || "默认环境"}

## 这一步的导演指令
- 任务：${directive.task || "按角色自然回应"}
- 小目标：${directive.goal || "推进剧情"}
- 台词提示：${directive.lineHint || "自然表达"}

## 近期演出
${recentHistory || "（这是开场）"}

## 输出格式（可选的才写）
💬 对话：（1-2 句）
🎯 动作：（必要时）
💭 心理：（必要时）
❤️ 表情：（必要时）

要求：自然、克制、避免过度解释。`;
}
