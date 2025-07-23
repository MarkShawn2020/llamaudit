/**
 * DeepSeek API 适配器
 * 将DeepSeek API适配为OpenRouter兼容的接口
 */

import { OpenRouterRequest, OpenRouterResponse, OpenRouterMessage, ApiResponse } from '@/components/knowledge-assistant/types';

export class DeepSeekAPIAdapter {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 发送聊天请求（适配OpenRouter接口）
   */
  async chat(request: OpenRouterRequest): Promise<ApiResponse<OpenRouterResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 1500,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `DeepSeek API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      
      // 转换为OpenRouter兼容格式
      const adaptedResponse: OpenRouterResponse = {
        id: data.id || 'deepseek-' + Date.now(),
        object: 'chat.completion',
        created: data.created || Math.floor(Date.now() / 1000),
        model: 'deepseek-chat',
        choices: data.choices.map((choice: any) => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: choice.finish_reason,
        })),
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };
      
      return {
        success: true,
        data: adaptedResponse,
      };
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DeepSeek API 请求失败',
      };
    }
  }

  /**
   * 流式聊天请求（适配OpenRouter接口）
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
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 1500,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `DeepSeek API stream request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取流式响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      onComplete();
      return { success: true };
    } catch (error) {
      console.error('DeepSeek API stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DeepSeek API 流式请求失败',
      };
    }
  }

  /**
   * 检查消息长度
   */
  static checkMessageLength(messages: OpenRouterMessage[], maxTokens: number = 4000) {
    const estimatedTokens = this.estimateTokens(messages.map(m => m.content).join('\n'));
    return {
      estimatedTokens,
      maxTokens,
      withinLimit: estimatedTokens <= maxTokens * 0.8, // 留20%余量
    };
  }

  /**
   * 估算token数量
   */
  static estimateTokens(text: string): number {
    // 简单估算：中文按字数计算，英文按词数计算
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  }
}