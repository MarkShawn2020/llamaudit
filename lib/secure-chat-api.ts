/**
 * 安全的聊天API客户端
 * 通过内部API路由调用，不暴露API密钥到客户端
 */

import { OpenRouterRequest, OpenRouterResponse, OpenRouterMessage, ApiResponse } from '@/components/knowledge-assistant/types';

export class SecureChatAPI {
  private baseUrl: string;

  constructor() {
    // 使用内部API路由，而不是外部API
    this.baseUrl = '/api';
  }

  /**
   * 发送聊天请求
   */
  async chat(request: OpenRouterRequest): Promise<ApiResponse<OpenRouterResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          maxTokens: request.max_tokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `Chat API request failed with status ${response.status}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Secure Chat API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '聊天API请求失败',
      };
    }
  }

  /**
   * 流式聊天请求（暂时使用普通请求实现）
   * TODO: 实现真正的流式响应
   */
  async chatStream(
    request: OpenRouterRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<ApiResponse<void>> {
    try {
      // 暂时使用普通请求模拟流式响应
      const result = await this.chat(request);
      
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || '流式聊天请求失败',
        };
      }

      const content = result.data.choices[0]?.message?.content || '';
      
      // 模拟流式输出
      const words = content.split('');
      for (let i = 0; i < words.length; i++) {
        onChunk(words[i]);
        // 添加小延迟模拟流式效果
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      onComplete();
      return { success: true };
    } catch (error) {
      console.error('Secure Chat API stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '流式聊天请求失败',
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

  /**
   * 验证API连接
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const testRequest: OpenRouterRequest = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        temperature: 0.7,
        max_tokens: 10,
      };

      const result = await this.chat(testRequest);
      return {
        success: result.success,
        data: result.success,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : 'API连接测试失败',
      };
    }
  }
}

// 导出统一的实例
export const secureChatAPI = new SecureChatAPI();