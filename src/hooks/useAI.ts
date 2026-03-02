import { useState } from "preact/hooks";
import { createClient } from "@/lib/openai/client";
import type { ProviderConfig } from "@/stores/types";

export interface AIThinkingConfig {
  enabled: boolean;
  param_key?: string;
  type?: "boolean" | "object";
  default?: unknown;
  budget_tokens?: number;
}

export interface AIGenerateOptions {
  temperature?: number;
  max_tokens?: number;
  thinking?: AIThinkingConfig;
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

  const generate = async <T = any>(
    provider: ProviderConfig,
    model: string,
    messages: { role: string; content: string }[],
    options: AIGenerateOptions = {},
  ): Promise<T> => {
    setIsGenerating(true);

    try {
      const client = createClient(provider);

      const response = await client.chat(messages, {
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2048,
        model,
        thinking: options.thinking,
      });

      // Parse JSON response, removing markdown code blocks
      const jsonStr = response.content.replace(/```(?:json)?/g, "").trim();
      const data = JSON.parse(jsonStr);

      return data as T;
    } finally {
      setIsGenerating(false);
    }
  };

  const cancel = () => {
    // Cancel is not supported by the current AIClient implementation
    setIsGenerating(false);
  };

  return {
    isGenerating,
    generate,
    cancel,
  };
}
