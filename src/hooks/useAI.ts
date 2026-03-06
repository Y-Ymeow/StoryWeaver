import { useState, useCallback } from "preact/hooks";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig } from "@/stores/types";
import { safeParseJSON } from "@/lib/json-parser";

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

  const generate = useCallback(
    async <T = any>(
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

          for await (const chunk of stream) {
            // 处理思考内容
            if (chunk.thinking !== null) {
              thinkingContent += chunk.thinking;
            }
            // 处理正常内容
            if (chunk.content !== null) {
              fullContent += chunk.content;
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
    },
    [],
  );

  const cancel = () => {
    setIsGenerating(false);
  };

  return {
    isGenerating,
    generate,
    cancel,
  };
}
