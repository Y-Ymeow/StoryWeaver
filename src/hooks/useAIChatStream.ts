/**
 * AI 流式对话 Hook - 处理流式 AI 对话请求
 */

import { useState, useCallback, useRef } from "preact/hooks";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig } from "@/stores/types";

export interface AIThinkingConfig {
  enabled: boolean;
  param_key?: string;
  type?: "boolean" | "object";
  default?: unknown;
  budget_tokens?: number;
}

export interface AIChatStreamOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  thinking?: AIThinkingConfig;
}

export interface AIChatStreamResult {
  content: string;
  thinkingContent: string;
}

export function useAIChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const chatStream = useCallback(async (
    provider: ProviderConfig,
    messages: { role: string; content: string }[],
    options: AIChatStreamOptions = {},
    onChunk?: (content: string, thinkingContent: string) => void,
  ): Promise<AIChatStreamResult> => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const client = createClient(provider);
      const stream = client.chatStream(messages, {
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2048,
        model: options.model,
        thinking: options.thinking,
      });

      let fullContent = "";
      let thinkingContent = "";
      let inThinking = false;

      for await (const chunk of stream) {
        // 检查是否被取消
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        // 检测思考标签
        if (chunk.includes("<think>") || chunk.includes("起")) {
          inThinking = true;
          continue;
        }
        if (chunk.includes("</think>") || chunk.includes("终")) {
          inThinking = false;
          continue;
        }

        if (inThinking) {
          thinkingContent += chunk;
        } else {
          fullContent += chunk;
        }

        // 通知调用者当前进度
        onChunk?.(fullContent, thinkingContent);
      }

      return { content: fullContent, thinkingContent };
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    chatStream,
    cancel,
  };
}
