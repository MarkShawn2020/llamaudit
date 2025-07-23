/**
 * OpenRouter AI API 封装
 */

import { OpenRouterRequest, OpenRouterResponse, OpenRouterMessage, ApiResponse, AssistantError } from '@/components/knowledge-assistant/types';

export class OpenRouterAPI {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 发送聊天请求
   */
  async chat(request: OpenRouterRequest): Promise<ApiResponse<OpenRouterResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Knowledge Assistant',
        },
        body: JSON.stringify({
          ...request,
          // 确保使用正确的模型名称
          model: request.model.includes('/') ? request.model : `anthropic/${request.model}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `OpenRouter API request failed with status ${response.status}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('OpenRouter API error:', error);
      
      const assistantError: AssistantError = {
        type: this.getErrorType(error),
        message: error instanceof Error ? error.message : 'AI 回复生成失败',
        details: error,
      };

      return {
        success: false,
        error: assistantError.message,
      };
    }
  }

  /**
   * 流式聊天请求
   */
  async chatStream(
    request: OpenRouterRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
          'X-Title': 'Knowledge Assistant',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
          model: request.model.includes('/') ? request.model : `anthropic/${request.model}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `OpenRouter API stream request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法创建流读取器');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            onComplete();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                onComplete();
                return { success: true };
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (parseError) {
                // 忽略解析错误，继续处理下一行
                console.warn('Failed to parse SSE chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return { success: true };
    } catch (error) {
      console.error('OpenRouter stream error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '流式回复失败',
      };
    }
  }

  /**
   * 构建系统提示词
   */
  static buildSystemPrompt(context: string, options?: {
    language?: string;
    style?: 'professional' | 'casual' | 'academic';
    includeSourceInfo?: boolean;
  }): string {
    const { 
      language = 'Chinese', 
      style = 'professional', 
      includeSourceInfo = true 
    } = options || {};

    const styleInstructions = {
      professional: '请用专业、准确的语言回答',
      casual: '请用友好、易懂的语言回答',
      academic: '请用学术、严谨的语言回答',
    };

    const basePrompt = `你是一个智能助手，专门基于提供的知识库内容回答用户问题。

知识库内容：
${context}

回答规则：
1. 优先基于上述知识库内容回答问题
2. 如果知识库内容不足以回答问题，请诚实说明
3. ${styleInstructions[style]}
4. 使用${language}回答
5. 保持回答简洁明了，重点突出
${includeSourceInfo ? '6. 必要时可以提及信息来源' : ''}

请基于知识库内容回答用户问题。`;

    return basePrompt;
  }

  /**
   * 构建对话消息
   */
  static buildMessages(
    userMessage: string,
    context: string,
    conversationHistory?: OpenRouterMessage[],
    options?: {
      systemPromptOptions?: Parameters<typeof OpenRouterAPI.buildSystemPrompt >[1];
      maxHistoryLength?: number;
    }
  ): OpenRouterMessage[] {
    const { systemPromptOptions, maxHistoryLength = 10 } = options || {};
    
    const systemPrompt = this.buildSystemPrompt(context, systemPromptOptions);
    
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // 添加对话历史（限制长度）
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory
        .filter(msg => msg.role !== 'system')
        .slice(-maxHistoryLength);
      messages.push(...recentHistory);
    }

    // 添加当前用户消息
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  /**
   * 获取模型配置
   */
  static getModelConfig(model: string): Partial<OpenRouterRequest> {
    const configs: Record<string, Partial<OpenRouterRequest>> = {
      'claude-3-haiku': {
        temperature: 0.7,
        max_tokens: 2000,
      },
      'claude-3-sonnet': {
        temperature: 0.7,
        max_tokens: 3000,
      },
      'claude-3-opus': {
        temperature: 0.7,
        max_tokens: 4000,
      },
      'gpt-4': {
        temperature: 0.7,
        max_tokens: 2000,
      },
      'gpt-3.5-turbo': {
        temperature: 0.8,
        max_tokens: 1500,
      },
    };

    return configs[model] || {
      temperature: 0.7,
      max_tokens: 2000,
    };
  }

  /**
   * 估算token使用量
   */
  static estimateTokens(text: string): number {
    // 简单的token估算：中文约1.5字符/token，英文约4字符/token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 检查消息长度是否超限
   */
  static checkMessageLength(
    messages: OpenRouterMessage[], 
    maxTokens: number = 4000
  ): { withinLimit: boolean; estimatedTokens: number; suggestions?: string[] } {
    const totalText = messages.map(m => m.content).join('\n');
    const estimatedTokens = this.estimateTokens(totalText);
    
    const withinLimit = estimatedTokens <= maxTokens;
    const suggestions: string[] = [];
    
    if (!withinLimit) {
      suggestions.push('考虑缩短对话历史');
      suggestions.push('减少知识库上下文长度');
      suggestions.push('分割长问题为多个短问题');
    }
    
    return {
      withinLimit,
      estimatedTokens,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * 获取错误类型
   */
  private getErrorType(error: any): AssistantError['type'] {
    if (error instanceof TypeError) {
      return 'network';
    }
    
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return 'network';
    }
    
    if (error?.message?.includes('API') || error?.message?.includes('model')) {
      return 'ai';
    }
    
    return 'unknown';
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.chat({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10,
      });
      
      return result.success;
    } catch {
      return false;
    }
  }
}

// 创建默认实例的工厂函数
export function createOpenRouterAPI(apiKey: string): OpenRouterAPI {
  return new OpenRouterAPI(apiKey);
}

// 导出静态方法以便直接使用
export const {
  buildSystemPrompt,
  buildMessages,
  getModelConfig,
  estimateTokens,
  checkMessageLength,
} = OpenRouterAPI;