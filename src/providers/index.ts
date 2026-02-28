/**
 * AI Provider 模块统一导出
 */

// 基础抽象类
export {
  BaseProvider,
  ProviderFactory,
  type Message,
  type RequestOptions,
  type ResponseResult,
  type StreamHandler
} from './base'

// OpenAI Provider
export { OpenAIProvider } from './openai'

// Gemini Provider
export { GeminiProvider } from './gemini'

// DeepSeek Provider
export { DeepSeekProvider } from './deepseek'

// 自定义 Provider 支持
export {
  CustomProvider,
  PREDEFINED_PROVIDERS,
  createPredefinedProviderConfig,
  getPredefinedProviders
} from './custom-providers'

// Provider 预设配置
export {
  PROVIDER_PRESETS,
  getProviderPreset,
  getSupportedProviders
} from './presets'

// API 客户端
export {
  AIClient,
  createClient,
  type ModelInfo,
  type APIResponse,
  type ChatOptions,
  APIError
} from '../lib/openai/client'
