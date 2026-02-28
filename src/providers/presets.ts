/**
 * AI Provider 预定义配置
 */

import type { ProviderPreset } from "@stores/types";

/**
 * 预定义 Provider 配置
 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  // OpenAI
  openai: {
    type: "openai",
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },

  // Gemini (Google)
  gemini: {
    type: "gemini",
    name: "Gemini (Google)",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },

  // DeepSeek
  deepseek: {
    type: "deepseek",
    name: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "",
    models: [],
    supportsThinking: true,
    thinkingParamKey: "enable_thinking",
    thinkingParamType: "boolean",
  },

  // 智谱 AI
  zhipu: {
    type: "zhipu",
    name: "智谱 AI",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "",
    models: [],
    supportsThinking: true,
    thinkingParamKey: "thinking",
    thinkingParamType: "object",
    thinkingParamDefault: { type: "enabled" },
  },

  // Groq
  groq: {
    type: "groq",
    name: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },

  // Cerebras
  cerebras: {
    type: "cerebras",
    name: "Cerebras",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },

  // Mistral
  mistral: {
    type: "mistral",
    name: "Mistral AI",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },

  // Custom (OpenAI 兼容)
  custom: {
    type: "custom",
    name: "自定义 (OpenAI 兼容)",
    defaultBaseUrl: "",
    defaultModel: "",
    models: [],
    supportsThinking: false,
  },
};

/**
 * 获取 Provider 预设配置
 */
export function getProviderPreset(type: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS[type];
}

/**
 * 获取所有支持的 Provider 列表
 */
export function getSupportedProviders(): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS);
}
