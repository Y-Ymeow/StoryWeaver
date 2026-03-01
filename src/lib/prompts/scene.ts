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

## 近期演出
${recentHistory || "（这是第一轮）"}

## 表演要求（重要）
1. **自然真实**：像真实生活中一样说话做事，不要夸张
2. **精简为主**：对话 1-2 句，动作/心理/表情**选 1-2 个**即可，不要全写
3. **留白艺术**：不需要每次都表达完整，适当的沉默和简单反应更真实
4. **符合情境**：根据剧情氛围调整反应强度（日常对话平淡，关键时刻才有强烈情绪）
5. **避免重复**：不要重复使用相同的表情和动作描述

## 输出格式（可选的才写，不要硬凑）
💬 对话：（主要表达方式，1-2 句）
🎯 动作：（必要时才写，简单描述）
💭 心理：（必要时才写，简短内心活动）
❤️ 表情：（必要时才写，简单情绪）

**记住：好的表演是自然的，不是每个字段都要填满。**

现在请为【${character.name}】生成第 ${roundNum} 轮的表演内容：`;
}
