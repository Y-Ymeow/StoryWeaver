/**
 * 统一的 AI API 客户端
 */

import type { ProviderConfig } from "@stores/types";

export interface ModelInfo {
  id: string;
  name?: string;
  created?: number;
  owned_by?: string;
}

export interface APIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: any;
}

export interface ChatStreamContent {
  content: string | null;
  thinking: string | null;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking?: {
    enabled: boolean;
    param_key?: string;
    type?: "boolean" | "object";
    default?: any;
    disabled?: any; // 禁用时的参数值
    budget_tokens?: number;
  };
  model?: string;
  reasoning_effort?: "low" | "medium" | "high"; // OpenAI reasoning_effort
}

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class AIClient {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  private getBaseURL(): string {
    return this.config.base_url || this.getDefaultBaseURL();
  }

  private getDefaultBaseURL(): string {
    switch (this.config.type) {
      case "openai":
        return "https://api.openai.com/v1";
      case "gemini":
        return "https://generativelanguage.googleapis.com/v1beta/openai";
      case "deepseek":
        return "https://api.deepseek.com/v1";
      case "zhipu":
        return "https://open.bigmodel.cn/api/paas/v4";
      case "groq":
        return "https://api.groq.com/openai/v1";
      case "cerebras":
        return "https://api.cerebras.ai/v1";
      case "mistral":
        return "https://api.mistral.ai/v1";
      default:
        return "https://api.openai.com/v1";
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.api_key}`,
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const url = `${this.getBaseURL()}/models`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!response.ok)
      throw new APIError(
        `获取模型列表失败：${response.status}`,
        response.status,
      );
    const data = await response.json();
    return (
      data.data?.map((m: any) => ({ id: m.id, name: m.name || m.id })) || []
    );
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    options?: ChatOptions,
  ): Promise<APIResponse> {
    const url = `${this.getBaseURL()}/chat/completions`;
    const body: Record<string, any> = {
      model: options?.model || this.config.model || "gpt-3.5-turbo",
      messages,
      // temperature: options?.temperature ?? 0.7,
      // max_tokens: options?.max_tokens ?? 2048,
      stream: options?.stream ?? false,
    };

    if (body.model.includes("gemma-3")) {
      const message = body.messages[0];
      message.role = "user";
      body.messages[0] = message;
    }

    // 处理思考模式 - 新模型默认输出 reasoning_content，必须显式禁用
    const paramKey = options?.thinking?.param_key || "thinking";
    const thinkingType = options?.thinking?.type || "boolean";
    const thinking = options?.thinking;

    if (thinking?.enabled) {
      // 启用思考
      if (thinkingType === "boolean") {
        body[paramKey] = true;
        if (thinking.budget_tokens)
          body["thinking_budget"] = thinking.budget_tokens;
      } else if (thinkingType === "object" && thinking.default) {
        body[paramKey] = thinking.default;
      } else {
        body[paramKey] = true;
      }
    } else {
      // 禁用思考 - 新模型必须显式发送禁用参数
      if (thinkingType === "boolean") {
        // body[paramKey] = false;
      } else if (thinkingType === "object" && thinking?.disabled) {
        // body[paramKey] = thinking.disabled;
      } else if (thinkingType === "object") {
        body[paramKey] = { type: "disabled" };
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error?.message || `API 请求失败：${response.status}`,
        response.status,
      );
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      raw: data,
    };
  }

  async *chatStream(
    messages: Array<{ role: string; content: string }>,
    options?: ChatOptions,
  ): AsyncGenerator<ChatStreamContent> {
    const url = `${this.getBaseURL()}/chat/completions`;

    const body: Record<string, any> = {
      model: options?.model || this.config.model || "gpt-3.5-turbo",
      messages,
      temperature: options?.temperature ?? 0.7,
      // max_tokens: options?.max_tokens ?? 2048,
      stream: true,
    };

    if (body.model.includes("gemma-3")) {
      const message = body.messages[0];
      message.role = "user";
      body.messages[0] = message;
    }

    // 处理思考模式 - 新模型默认输出 reasoning_content，必须显式禁用
    const paramKey = options?.thinking?.param_key || "enable_thinking";
    const thinkingType = options?.thinking?.type || "boolean";
    const thinking = options?.thinking;

    if (thinking?.enabled) {
      // 启用思考
      if (thinkingType === "boolean") {
        body[paramKey] = true;
      } else if (thinkingType === "object" && thinking.default) {
        body[paramKey] = thinking.default;
      }
    } else {
      // 禁用思考 - 新模型必须显式发送禁用参数
      if (thinkingType === "boolean") {
      } else if (thinkingType === "object" && thinking?.disabled) {
      } else if (thinkingType === "object") {
        body[paramKey] = { type: "disabled" };
      }
    }

    // 处理 OpenAI reasoning_effort 参数
    // 只在显式配置且启用思考模式时才发送
    if (options?.reasoning_effort && thinking && thinking?.enabled) {
      body.reasoning_effort = options.reasoning_effort;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new APIError(`流式请求失败`, response.status);

    const reader = response.body?.getReader();
    if (!reader) throw new APIError("无法获取响应流");

    const decoder = new TextDecoder();
    let buffer = "";
    let hasThinking = false;
    let hasThinkingEnd = thinking?.enabled;
    let thinkingEnd = true;

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
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta || {};

            const reasoningContent =
              delta.reasoning_content || delta.reasoning || delta.reasoningText;

            if (!reasoningContent && hasThinking) {
              if (delta.content.includes("<think>")) {
                hasThinking = true;
                thinkingEnd = false;
              }

              if (delta.content.includes("</think>")) {
                hasThinking = false;
                thinkingEnd = true;
              }

              if (hasThinking && !thinkingEnd) {
                delta.reasoning_content = delta.content;
              }
            }

            if (reasoningContent) {
              yield { content: null, thinking: String(reasoningContent) };
            }
            const content = delta.content;
            if (content) yield { content: content, thinking: null };
          } catch {}
        }
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.chat([{ role: "user", content: "Hello" }], { max_tokens: 5 });
      return true;
    } catch {
      return false;
    }
  }
}

export function createClient(config: ProviderConfig): AIClient {
  return new AIClient(config);
}
