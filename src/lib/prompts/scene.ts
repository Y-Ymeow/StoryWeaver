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
  // 获取最近历史（最多3轮）
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
        if (parsed.dialogue) parts.push(`"${parsed.dialogue}"`);
        if (parsed.action) parts.push(`（动作：${parsed.action}）`);
        if (parsed.thought) parts.push(`（心理：${parsed.thought}）`);
        if (parsed.emotion) parts.push(`（表情：${parsed.emotion}）`);
        content = parts.join(" ") || p.content;
      } catch {}
      return `${char?.name}：${content}`;
    })
    .join("\n");

  return `你正在扮演角色【${character.name}】进行即兴表演。

## 角色设定
- 姓名：${character.name}
- 背景：${character.background || "普通人物"}
- 性格：${character.personality || "无特殊设定"}
- 台词风格：${character.dialogue_style || "自然口语"}

## 当前场景
- 场景：${scene.name}
- 描述：${scene.description || ""}
${scene.goal ? `- 场景最终目标：${scene.goal}` : ""}
- 当前是第 ${roundNum} 轮

## 🎯 本轮目标
${roundGoal || "根据剧情自然发展"}

## 近期演出
${recentHistory || "（这是第一轮演出）"}

## 表演要求
1. 围绕本轮目标进行表演
2. 只输出【一轮】的表演内容
3. 内容精简，对话2-3句以内

## 输出格式
💬 对话：角色说的话（必填）
🎯 动作：角色的动作行为（可选）
💭 心理：角色的内心想法（可选）
❤️ 表情：角色的情绪表情（可选）

现在请为【${character.name}】生成第 ${roundNum} 轮的表演内容：`;
}
