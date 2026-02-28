/**
 * 自定义 OpenAI-like Provider 支持
 *
 * 支持各种兼容 OpenAI API 格式的服务
 */

import {
  BaseProvider,
  type Message,
  type RequestOptions,
  type ResponseResult,
  type StreamHandler,
} from "./base";
import type { ProviderConfig } from "@stores";

/**
 * 预定义的 OpenAI-like 服务配置
 */
export const PREDEFINED_PROVIDERS: Record<
  string,
  {
    name: string;
    baseURL: string;
    defaultModel: string;
    models: string[];
  }
> = {
  // Anthropic (通过代理)
  anthropic: {
    name: "Anthropic",
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-sonnet-20240229",
    models: [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  },
  // Azure OpenAI
  azure: {
    name: "Azure OpenAI",
    baseURL:
      "https://{resource}.openai.azure.com/openai/deployments/{deployment}",
    defaultModel: "gpt-35-turbo",
    models: ["gpt-4", "gpt-35-turbo"],
  },
  // Ollama (本地)
  ollama: {
    name: "Ollama",
    baseURL: "http://localhost:11434/v1",
    defaultModel: "llama2",
    models: ["llama2", "mistral", "codellama", "phi"],
  },
  // LM Studio (本地)
  lmstudio: {
    name: "LM Studio",
    baseURL: "http://localhost:1234/v1",
    defaultModel: "local-model",
    models: [],
  },
  // Together AI
  together: {
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-2-70b-chat-hf",
    models: [
      "meta-llama/Llama-2-70b-chat-hf",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "google/gemma-7b-it",
    ],
  },
  // Groq
  groq: {
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama2-70b-4096",
    models: ["llama2-70b-4096", "mixtral-8x7b-32768", "gemma-7b-it"],
  },
  // Perplexity
  perplexity: {
    name: "Perplexity",
    baseURL: "https://api.perplexity.ai",
    defaultModel: "mistral-7b-instruct",
    models: [
      "mistral-7b-instruct",
      "codellama-34b-instruct",
      "sonar-small-chat",
      "sonar-medium-chat",
    ],
  },
};

/**
 * 自定义 OpenAI-like Provider
 */
export class CustomProvider extends BaseProvider {
  private customBaseURL: string;
  private customName: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.customBaseURL = config.base_url || "https://api.openai.com/v1";
    this.customName = config.name || "Custom";
  }

  getName(): string {
    return this.customName;
  }

  getDefaultBaseURL(): string {
    return this.customBaseURL;
  }

  getDefaultModel(): string {
    return this.config.model || "gpt-3.5-turbo";
  }

  getSupportedModels(): string[] {
    // 自定义 Provider 的模型列表需要从配置获取或通过 API 查询
    return this.config.model ? [this.config.model] : ["gpt-3.5-turbo"];
  }

  async chat(
    messages: Message[],
    options?: RequestOptions,
  ): Promise<ResponseResult> {
    const url = `${this.getBaseURL()}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.model || this.getDefaultModel(),
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      this.handleError(response);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model || this.config.model || this.getDefaultModel(),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      raw: data,
    };
  }

  async chatStream(
    messages: Message[],
    handler: StreamHandler,
    options?: RequestOptions,
  ): Promise<ResponseResult> {
    const url = `${this.getBaseURL()}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.model || this.getDefaultModel(),
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      this.handleError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let model = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.model) model = parsed.model;
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              handler(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    return {
      content: fullContent,
      model: model || this.config.model || this.getDefaultModel(),
      raw: { finish: true },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.chat([{ role: "user", content: "Hello" }], { maxTokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 创建预定义 Provider 的配置
 */
export function createPredefinedProviderConfig(
  providerKey: string,
  apiKey: string,
  model?: string,
): ProviderConfig {
  const predefined = PREDEFINED_PROVIDERS[providerKey];
  if (!predefined) {
    throw new Error(`未知的预定义 Provider: ${providerKey}`);
  }

  return {
    id: crypto.randomUUID(),
    name: predefined.name,
    type: "custom",
    api_key: apiKey,
    base_url: predefined.baseURL,
    model: model || predefined.defaultModel,
    is_active: true,
  };
}

/**
 * 获取所有预定义 Provider 信息
 */
export function getPredefinedProviders(): Array<{
  key: string;
  name: string;
  baseURL: string;
  defaultModel: string;
  models: string[];
}> {
  return Object.entries(PREDEFINED_PROVIDERS).map(([key, value]) => ({
    key,
    ...value,
  }));
}
