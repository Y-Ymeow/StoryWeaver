/**
 * AI Provider 抽象基类
 * 
 * 定义所有 AI Provider 的统一接口
 */

import type { ProviderConfig } from '@stores'

/**
 * 消息类型
 */
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 请求选项
 */
export interface RequestOptions {
  temperature?: number
  maxTokens?: number
  stream?: boolean
  stop?: string[]
}

/**
 * 响应结果
 */
export interface ResponseResult {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  raw?: any
}

/**
 * 流式响应处理器
 */
export type StreamHandler = (chunk: string) => void

/**
 * AI Provider 抽象基类
 */
export abstract class BaseProvider {
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  /**
   * 获取 Provider 名称
   */
  abstract getName(): string

  /**
   * 获取 Provider 类型
   */
  getType(): string {
    return this.config.type
  }

  /**
   * 发送聊天请求
   */
  abstract chat(
    messages: Message[],
    options?: RequestOptions
  ): Promise<ResponseResult>

  /**
   * 流式聊天请求
   */
  abstract chatStream(
    messages: Message[],
    handler: StreamHandler,
    options?: RequestOptions
  ): Promise<ResponseResult>

  /**
   * 测试连接
   */
  abstract testConnection(): Promise<boolean>

  /**
   * 获取默认模型
   */
  abstract getDefaultModel(): string

  /**
   * 获取支持的模型列表
   */
  abstract getSupportedModels(): string[]

  /**
   * 验证配置
   */
  validateConfig(): boolean {
    return !!this.config.api_key
  }

  /**
   * 构建基础 URL
   */
  protected getBaseURL(): string {
    return this.config.base_url || this.getDefaultBaseURL()
  }

  /**
   * 获取默认基础 URL（子类实现）
   */
  protected abstract getDefaultBaseURL(): string

  /**
   * 构建请求头
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.api_key}`
    }
  }

  /**
   * 处理错误响应
   */
  protected handleError(response: Response): never {
    throw new Error(`API 请求失败：${response.status} ${response.statusText}`)
  }
}

/**
 * Provider 工厂
 */
export class ProviderFactory {
  private static providers: Map<string, new (config: ProviderConfig) => BaseProvider> = new Map()

  /**
   * 注册 Provider
   */
  static register(
    type: string,
    providerClass: new (config: ProviderConfig) => BaseProvider
  ): void {
    this.providers.set(type, providerClass)
  }

  /**
   * 创建 Provider 实例
   */
  static create(config: ProviderConfig): BaseProvider {
    const ProviderClass = this.providers.get(config.type)
    if (!ProviderClass) {
      throw new Error(`未知的 Provider 类型：${config.type}`)
    }
    return new ProviderClass(config)
  }

  /**
   * 获取所有注册的 Provider 类型
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.providers.keys())
  }
}
