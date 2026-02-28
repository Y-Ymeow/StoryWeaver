/**
 * 解析单段场景内容
 */
export function parseSceneContent(content: string): {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
} {
  const result: {
    dialogue?: string;
    action?: string;
    thought?: string;
    emotion?: string;
  } = {};

  // 尝试解析 JSON 格式
  try {
    const parsed = JSON.parse(content);
    if (parsed.dialogue) result.dialogue = parsed.dialogue;
    if (parsed.action) result.action = parsed.action;
    if (parsed.thought) result.thought = parsed.thought;
    if (parsed.emotion) result.emotion = parsed.emotion;
    if (Object.keys(result).length > 0) return result;
  } catch {}

  // 解析带标签的格式：💬 对话：内容
  // 匹配到下一个标签或内容结束
  const parseLabeledContent = (
    content: string,
    patterns: string[],
    emoji: string
  ): string | undefined => {
    // 构建匹配模式：emoji 或 中文标签 或 英文标签，后面跟冒号
    const labelPattern = patterns.join('|');
    const regex = new RegExp(
      `(?:${emoji}|${labelPattern})[:：]\\s*([\\s\\S]*?)(?=(?:${emoji}|💬|🎯|💭|❤️|对话|动作|心理|表情|情绪|dialogue|action|thought|emotion|$))`,
      'gi'
    );
    const match = regex.exec(content);
    if (match && match[1]) {
      // 清理结果：去除前后空白和可能残留的标签
      return match[1].trim();
    }
    return undefined;
  };

  // 按顺序解析各类型
  const dialogue = parseLabeledContent(content, ['对话', 'dialogue'], '💬');
  const action = parseLabeledContent(content, ['动作', 'action'], '🎯');
  const thought = parseLabeledContent(content, ['心理', 'thought'], '💭');
  const emotion = parseLabeledContent(content, ['表情', '情绪', 'emotion'], '❤️');

  if (dialogue) result.dialogue = dialogue;
  if (action) result.action = action;
  if (thought) result.thought = thought;
  if (emotion) result.emotion = emotion;

  // 如果没有任何匹配，整个内容作为对话
  if (Object.keys(result).length === 0) {
    result.dialogue = content.trim();
  }

  return result;
}

/**
 * 解析多条表演内容
 * 当 AI 返回多段内容时，解析为数组
 */
export function parseMultiplePerformances(content: string): Array<{
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}> {
  const results: Array<{
    dialogue?: string;
    action?: string;
    thought?: string;
    emotion?: string;
  }> = [];

  // 尝试按双换行分割段落（每个段落是一段完整的表演）
  const paragraphs = content.split(/\n\s*\n+/).filter(p => p.trim());
  
  for (const paragraph of paragraphs) {
    // 检查段落是否包含标签
    const hasLabels = /(?:💬|🎯|💭|❤️|对话|动作|心理|表情|情绪|dialogue|action|thought|emotion)[:：]/i.test(paragraph);
    
    if (hasLabels) {
      const parsed = parseSceneContent(paragraph);
      if (Object.keys(parsed).length > 0) {
        results.push(parsed);
      }
    } else if (paragraph.trim()) {
      // 没有标签的内容，整体作为对话
      results.push({ dialogue: paragraph.trim() });
    }
  }

  // 如果没有分割出多个段落，返回单个结果
  if (results.length === 0) {
    const single = parseSceneContent(content);
    if (Object.keys(single).length > 0) {
      results.push(single);
    }
  }

  return results;
}
