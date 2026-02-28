/**
 * Gemini Provider 实现
 */

import { BaseProvider, type Message, type RequestOptions, type ResponseResult, type StreamHandler } from './base'
import type { ProviderConfig } from '@stores'

export class GeminiProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  getName(): string {
    return 'Gemini'
  }

  getDefaultBaseURL(): string {
    return 'https://generativelanguage.googleapis.com/v1beta'
  }

  getDefaultModel(): string {
    return 'gemini-pro'
  }

  getSupportedModels(): string[] {
    return [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ]
  }

  async chat(
    messages: Message[],
    options?: RequestOptions
  ): Promise<ResponseResult> {
    const model = this.config.model || this.getDefaultModel()
    const url = `${this.getBaseURL()}/models/${model}:generateContent?key=${this.config.api_key}`
    
    // 转换消息格式为 Gemini 格式
    const geminiMessages = this.convertMessages(messages)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1024,
          stopSequences: options?.stop
        }
      })
    })

    if (!response.ok) {
      this.handleError(response)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    return {
      content,
      model,
      raw: data
    }
  }

  async chatStream(
    messages: Message[],
    handler: StreamHandler,
    options?: RequestOptions
  ): Promise<ResponseResult> {
    const model = this.config.model || this.getDefaultModel()
    const url = `${this.getBaseURL()}/models/${model}:streamGenerateContent?key=${this.config.api_key}&alt=sse`
    
    const geminiMessages = this.convertMessages(messages)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 1024,
          stopSequences: options?.stop
        }
      })
    })

    if (!response.ok) {
      this.handleError(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      const parts = buffer.split('\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed) {
          try {
            const data = JSON.parse(trimmed)
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (content) {
              fullContent += content
              handler(content)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    return {
      content: fullContent,
      model,
      raw: { finish: true }
    }
  }

  /**
   * 转换消息格式
   */
  private convertMessages(messages: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.chat(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 5 }
      )
      return true
    } catch {
      return false
    }
  }
}
