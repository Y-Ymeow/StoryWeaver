import { useState, useCallback } from "preact/hooks";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig } from "@/stores/types";

function safeParseJSON<T = unknown>(text: string): T {
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

function findBalancedJsonEnd(text: string, start: number): number {
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

export interface AIThinkingConfig {
  enabled: boolean;
  param_key?: string;
  type?: "boolean" | "object";
  default?: unknown;
  disabled?: unknown; // 禁用思考时的参数值
  budget_tokens?: number;
}

export interface AIGenerateOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  thinking?: AIThinkingConfig;
  reasoning_effort?: "low" | "medium" | "high"; // OpenAI reasoning_effort
  onStream?: (content: string, thinkingContent: string) => void;
}

export interface UseAIReturn {
  isGenerating: boolean;
  generate: <T = any>(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
    options?: AIGenerateOptions,
  ) => Promise<T>;
  cancel: () => void;
}

export function useAI(): UseAIReturn {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async <T = any>(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
    options: AIGenerateOptions = {},
  ): Promise<T> => {
    setIsGenerating(true);

    try {
      const client = createClient(provider);
      
      // 如果有 onStream 回调，使用流式
      if (options.onStream) {
        const stream = client.chatStream(messages, {
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          model: options.model || model,
          thinking: options.thinking,
          reasoning_effort: options.reasoning_effort,
        });

        let fullContent = "";
        let thinkingContent = "";
        let inThinking = false;

        for await (const chunk of stream) {
          if (chunk.includes("<think>")) {
            inThinking = true;
            continue;
          }
          if (chunk.includes("</think>")) {
            inThinking = false;
            continue;
          }
          if (inThinking) {
            thinkingContent += chunk;
          } else {
            fullContent += chunk;
          }
          options.onStream(fullContent, thinkingContent);
        }

        return safeParseJSON<T>(fullContent);
      } else {
        // 普通请求
        const response = await client.chat(messages, {
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          model: options.model || model,
          thinking: options.thinking,
          reasoning_effort: options.reasoning_effort,
        });

        const data = safeParseJSON<T>(response.content);

        return data as T;
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const cancel = () => {
    setIsGenerating(false);
  };

  return {
    isGenerating,
    generate,
    cancel,
  };
}
