/**
 * AI 响应处理模块
 */

import type { Performance } from '@stores'

/**
 * 解析后的内容
 */
export interface ParsedContent {
  dialogue?: string;
  action?: string;
  thought?: string;
  emotion?: string;
}

/**
 * 响应内容块
 */
export interface ContentBlock {
  type: string
  content: string
  displayLabel: string
}

/**
 * 解析 AI 响应内容（支持 JSON 格式和旧格式）
 */
export function parseAIMultiContent(content: string): ParsedContent {
  const result: ParsedContent = {};
  
  // 尝试解析 JSON 格式
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object') {
      if (parsed.dialogue) result.dialogue = parsed.dialogue;
      if (parsed.action) result.action = parsed.action;
      if (parsed.thought) result.thought = parsed.thought;
      if (parsed.emotion) result.emotion = parsed.emotion;
      return result;
    }
  } catch {
    // 不是 JSON，继续用正则解析
  }
  
  // 旧格式解析：[type: content]
  const patterns: Record<string, RegExp> = {
    dialogue: /\[?(?:对话|dialogue|message)[:：]\s*([^\]\n]+)/i,
    action: /\[?(?:动作|action|behavior)[:：]\s*([^\]\n]+)/i,
    thought: /\[?(?:心理|thought)[:：]\s*([^\]\n]+)/i,
    emotion: /\[?(?:表情 | 情绪|emotion)[:：]\s*([^\]\n]+)/i,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      result[type as keyof ParsedContent] = match[1].trim();
    }
  }

  // 如果没有任何匹配，整个内容作为对话
  if (Object.keys(result).length === 0) {
    result.dialogue = content.trim();
  }

  return result;
}

/**
 * 处理 AI 响应内容
 */
export function processAIResponse(content: string): ContentBlock[] {
  const parsed = parseAIMultiContent(content)
  const blocks: ContentBlock[] = []

  if (parsed.dialogue) {
    blocks.push({ type: 'dialogue', content: parsed.dialogue, displayLabel: '💬 对话' })
  }
  if (parsed.action) {
    blocks.push({ type: 'action', content: parsed.action, displayLabel: '🎬 动作' })
  }
  if (parsed.thought) {
    blocks.push({ type: 'thought', content: parsed.thought, displayLabel: '💭 心理' })
  }
  if (parsed.emotion) {
    blocks.push({ type: 'emotion', content: parsed.emotion, displayLabel: '❤️ 情绪' })
  }

  return blocks
}

/**
 * 格式化响应内容用于显示
 */
export function formatForDisplay(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    return `[${block.displayLabel}] ${block.content}`
  }).join('\n')
}

/**
 * 提取纯对话内容
 */
export function extractDialogue(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'dialogue')
    .map(b => b.content)
    .join('\n')
}

/**
 * 提取动作内容
 */
export function extractAction(blocks: ContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'action')
    .map(b => b.content)
    .join('\n')
}

/**
 * 构建表演记录内容（JSON 格式）
 */
export function buildPerformanceContent(
  dialogue?: string,
  action?: string,
  thought?: string,
  emotion?: string
): string {
  const content: Record<string, string> = {};
  if (dialogue) content.dialogue = dialogue;
  if (action) content.action = action;
  if (thought) content.thought = thought;
  if (emotion) content.emotion = emotion;
  return JSON.stringify(content);
}

/**
 * 获取主要类型
 */
export function getPrimaryType(content: string): Performance['primary_type'] {
  try {
    const parsed = JSON.parse(content);
    if (parsed.dialogue) return 'dialogue';
    if (parsed.action) return 'action';
    if (parsed.thought) return 'thought';
    if (parsed.emotion) return 'emotion';
  } catch {
    // 旧格式，默认返回 dialogue
  }
  return 'dialogue';
}
