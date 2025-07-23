/**
 * AI 聊天 Hook
 */

import { useState, useCallback, useRef } from 'react';
import { OpenRouterAPI, buildMessages, getModelConfig } from '@/lib/openrouter-api';
import { KnowledgeAPI } from '@/lib/knowledge-api';
import { 
  OpenRouterMessage,
  UseAIChatReturn,
  AssistantConfig,
  DifyRetrievalResponse
} from '@/components/knowledge-assistant/types';

export function useAIChat(config: AssistantConfig): UseAIChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const apiRef = useRef<OpenRouterAPI | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // 初始化API实例
  if (!apiRef.current) {
    apiRef.current = new OpenRouterAPI(config.openRouterApiKey);
  }

  // 发送消息到AI
  const sendToAI = useCallback(async (
    messages: OpenRouterMessage[],
    options?: {
      stream?: boolean;
      onChunk?: (chunk: string) => void;
    }
  ): Promise<string> => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const modelConfig = getModelConfig(config.aiModel);
      const request = {
        model: config.aiModel,
        messages,
        ...modelConfig,
        max_tokens: config.maxContextLength || modelConfig.max_tokens,
      };

      // 检查消息长度
      const lengthCheck = OpenRouterAPI.checkMessageLength(messages, request.max_tokens);
      if (!lengthCheck.withinLimit) {
        console.warn('Message length exceeds limit:', lengthCheck);
        // 可以选择截断或提醒用户
      }

      let result;
      if (options?.stream && options?.onChunk) {
        // 流式响应
        let fullResponse = '';
        const streamResult = await apiRef.current!.chatStream(
          request,
          (chunk) => {
            fullResponse += chunk;
            options.onChunk!(chunk);
          },
          () => {
            // 流式完成
          }
        );

        if (!streamResult.success) {
          throw new Error(streamResult.error || 'AI 流式回复失败');
        }

        result = fullResponse;
      } else {
        // 普通响应
        const chatResult = await apiRef.current!.chat(request);
        
        if (!chatResult.success || !chatResult.data) {
          throw new Error(chatResult.error || 'AI 回复生成失败');
        }

        result = chatResult.data.choices[0]?.message?.content || '';
      }

      if (!result.trim()) {
        throw new Error('AI 返回了空响应');
      }

      return result.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI 回复生成失败';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = undefined;
    }
  }, [config]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 取消当前请求
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
      setIsLoading(false);
    }
  }, []);

  return {
    sendToAI,
    isLoading,
    error,
    clearError,
    cancelRequest,
  };
}

/**
 * 智能对话 Hook - 结合知识检索和AI回复
 */
export function useSmartChat(config: AssistantConfig) {
  const aiChat = useAIChat(config);
  const [conversationHistory, setConversationHistory] = useState<OpenRouterMessage[]>([]);

  // 生成基于知识库的回复
  const generateResponse = useCallback(async (
    userMessage: string,
    retrievalResult: DifyRetrievalResponse,
    options?: {
      stream?: boolean;
      onChunk?: (chunk: string) => void;
      maxHistoryLength?: number;
    }
  ): Promise<string> => {
    const { maxHistoryLength = 10 } = options || {};

    // 格式化知识上下文
    const context = KnowledgeAPI.formatRetrievalContext(retrievalResult, {
      includeMetadata: true,
      maxLength: config.maxContextLength ? Math.floor(config.maxContextLength * 0.6) : 2400,
    });

    // 构建消息
    const messages = buildMessages(
      userMessage,
      context,
      conversationHistory.slice(-maxHistoryLength),
      {
        systemPromptOptions: {
          language: 'Chinese',
          style: 'professional',
          includeSourceInfo: true,
        },
      }
    );

    // 发送到AI
    const response = await aiChat.sendToAI(messages, options);

    // 更新对话历史
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response },
    ]);

    return response;
  }, [aiChat, conversationHistory, config]);

  // 清除对话历史
  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  // 获取对话统计
  const getConversationStats = useCallback(() => {
    const userMessages = conversationHistory.filter(m => m.role === 'user').length;
    const assistantMessages = conversationHistory.filter(m => m.role === 'assistant').length;
    const totalCharacters = conversationHistory.reduce((sum, m) => sum + m.content.length, 0);

    return {
      userMessages,
      assistantMessages,
      totalMessages: conversationHistory.length,
      totalCharacters,
      estimatedTokens: OpenRouterAPI.estimateTokens(conversationHistory.map(m => m.content).join('\n')),
    };
  }, [conversationHistory]);

  return {
    ...aiChat,
    generateResponse,
    conversationHistory,
    clearHistory,
    getConversationStats,
  };
}

/**
 * AI 回复质量评估 Hook
 */
export function useAIResponseQuality() {
  const [responses, setResponses] = useState<Array<{
    id: string;
    query: string;
    response: string;
    context: DifyRetrievalResponse;
    timestamp: Date;
    rating?: number;
    feedback?: string;
  }>>([]);

  // 记录回复
  const recordResponse = useCallback((
    query: string,
    response: string,
    context: DifyRetrievalResponse
  ) => {
    const newResponse = {
      id: crypto.randomUUID(),
      query,
      response,
      context,
      timestamp: new Date(),
    };

    setResponses(prev => [...prev, newResponse]);
    return newResponse.id;
  }, []);

  // 评价回复
  const rateResponse = useCallback((
    responseId: string,
    rating: number,
    feedback?: string
  ) => {
    setResponses(prev => prev.map(r => 
      r.id === responseId 
        ? { ...r, rating, feedback }
        : r
    ));
  }, []);

  // 获取评价统计
  const getRatingStats = useCallback(() => {
    const ratedResponses = responses.filter(r => r.rating !== undefined);
    if (ratedResponses.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
      };
    }

    const totalRating = ratedResponses.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating = totalRating / ratedResponses.length;

    const distribution = ratedResponses.reduce((acc, r) => {
      const rating = r.rating || 0;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      averageRating,
      totalRatings: ratedResponses.length,
      ratingDistribution: distribution,
    };
  }, [responses]);

  // 获取改进建议
  const getImprovementSuggestions = useCallback(() => {
    const lowRatedResponses = responses.filter(r => r.rating && r.rating < 3);
    const commonIssues = lowRatedResponses
      .map(r => r.feedback)
      .filter(Boolean)
      .reduce((acc, feedback) => {
        // 简单的关键词提取
        const keywords = feedback!.toLowerCase().split(/\s+/);
        keywords.forEach(keyword => {
          if (keyword.length > 3) { // 过滤短词
            acc[keyword] = (acc[keyword] || 0) + 1;
          }
        });
        return acc;
      }, {} as Record<string, number>);

    const suggestions = Object.entries(commonIssues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([keyword, count]) => ({
        issue: keyword,
        frequency: count,
        suggestion: getSuggestionForIssue(keyword),
      }));

    return suggestions;
  }, [responses]);

  return {
    responses,
    recordResponse,
    rateResponse,
    getRatingStats,
    getImprovementSuggestions,
  };
}

// 辅助函数：根据问题类型获取建议
function getSuggestionForIssue(issue: string): string {
  const suggestions: Record<string, string> = {
    '不准确': '考虑调整检索参数或优化知识库内容',
    '不完整': '增加回复的详细程度或检索更多相关内容',
    '不相关': '改进知识检索的相关性匹配',
    '难理解': '简化表达方式，使用更通俗的语言',
    '太长': '控制回复长度，突出重点信息',
    '太短': '提供更详细的解释和背景信息',
  };

  return suggestions[issue] || '继续优化回复质量';
}

export default useAIChat;