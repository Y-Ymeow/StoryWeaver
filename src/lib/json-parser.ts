/**
 * JSON 解析工具函数
 * 用于从 AI 返回的文本中提取和解析 JSON
 */

/**
 * 查找平衡的 JSON 结束位置
 * @param text - 要搜索的文本
 * @param start - JSON 开始位置的索引
 * @returns JSON 结束位置的索引，如果未找到返回 -1
 */
export function findBalancedJsonEnd(text: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  const startChar = text[start];
  if (startChar === "{") stack.push("}");
  else if (startChar === "[") stack.push("]");
  else return -1;

  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      stack.push("}");
      continue;
    }
    if (ch === "[") {
      stack.push("]");
      continue;
    }
    if ((ch === "}" || ch === "]") && stack.length > 0) {
      const expected = stack[stack.length - 1];
      if (ch !== expected) return -1;
      stack.pop();
      if (stack.length === 0) return i;
    }
  }

  return -1;
}

/**
 * 安全地解析 JSON，支持多种格式
 * - 直接 JSON
 * - Markdown code block 包裹的 JSON
 * - 文本中嵌入的 JSON 片段
 * @param text - 要解析的文本
 * @returns 解析后的 JSON 对象
 * @throws 如果未找到可解析的 JSON
 */
export function safeParseJSON<T = unknown>(text: string): T {
  const trimmed = text.trim();

  // 1) 先尝试整段解析
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // ignore
  }

  // 2) 优先尝试 markdown code block
  const codeBlockPattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null;
  while ((match = codeBlockPattern.exec(text)) !== null) {
    const candidate = match[1]?.trim();
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // ignore
    }
  }

  // 3) 扫描所有平衡 JSON 片段，逐个尝试解析
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findBalancedJsonEnd(cleaned, i);
    if (end === -1) continue;
    const candidate = cleaned.slice(i, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // continue scan
    }
  }

  throw new Error("AI 返回中未找到可解析 JSON");
}
