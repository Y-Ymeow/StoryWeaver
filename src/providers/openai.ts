/**
 * OpenAI Provider 实现
 */

import { BaseProvider, type Message, type RequestOptions, type ResponseResult, type StreamHandler } from './base'
import type { ProviderConfig } from '@stores'

export class OpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  getName(): string {
    return 'OpenAI'
  }

  getDefaultBaseURL(): string {
    return 'https://api.openai.com/v1'
  }

  getDefaultModel(): string {
    return 'gpt-3.5-turbo'
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ]
  }

  async chat(
    messages: Message[],
    options?: RequestOptions
  ): Promise<ResponseResult> {
    const url = `${this.getBaseURL()}/chat/completions`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.model || this.getDefaultModel(),
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: false
      })
    })

    if (!response.ok) {
      this.handleError(response)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      raw: data
    }
  }

  async chatStream(
    messages: Message[],
    handler: StreamHandler,
    options?: RequestOptions
  ): Promise<ResponseResult> {
    const url = `${this.getBaseURL()}/chat/completions`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.model || this.getDefaultModel(),
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: true
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
    let model = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            break
          }
          
          try {
            const parsed = JSON.parse(data)
            if (parsed.model) model = parsed.model
            const content = parsed.choices?.[0]?.delta?.content
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
      model: model || this.config.model || this.getDefaultModel(),
      raw: { finish: true }
    }
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
