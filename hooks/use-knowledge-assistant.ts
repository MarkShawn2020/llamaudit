/**
 * 智能问答助手主要 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ChatMessage, 
  UseKnowledgeAssistantReturn, 
  AssistantConfig,
  AssistantError 
} from '@/components/knowledge-assistant/types';
import { useKnowledgeRetrieval } from './use-knowledge-retrieval';
import { useSmartChat } from './use-ai-chat';
import { SecureKnowledgeAPI } from '@/lib/secure-knowledge-api';

export function useKnowledgeAssistant(config: AssistantConfig): UseKnowledgeAssistantReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knowledgeRetrieval = useKnowledgeRetrieval(config);
  const smartChat = useSmartChat(config);
  const lastMessageRef = useRef<ChatMessage | null>(null);
  
  console.log('🔄 useKnowledgeAssistant hook 初始化:', {
    isOpen,
    messagesLength: messages.length,
    isLoading,
    error,
    configDatasetId: config?.datasetId
  });
  
  // 监听 isOpen 状态变化
  useEffect(() => {
    console.log('🔄 isOpen 状态变化:', isOpen);
  }, [isOpen]);
  
  // 监听 messages 状态变化
  useEffect(() => {
    console.log('🔄 messages 状态变化:', messages.length);
  }, [messages]);
  
  // 监听 error 状态变化
  useEffect(() => {
    console.log('🔄 error 状态变化:', error);
  }, [error]);

  // 打开助手
  const openAssistant = useCallback(() => {
    console.log('🔄 === useKnowledgeAssistant.openAssistant 调用开始 ===');
    console.log('🔄 调用前 isOpen 状态:', isOpen);
    
    try {
      setIsOpen(true);
      console.log('🔄 setIsOpen(true) 调用完成');
      
      setError(null);
      console.log('🔄 setError(null) 调用完成');
      
      // 使用 setTimeout 检查状态是否更新
      setTimeout(() => {
        console.log('🔄 openAssistant 后延迟检查 isOpen:', isOpen);
      }, 0);
      
    } catch (error) {
      console.error('❌ openAssistant 内部错误:', error);
    }
    
    console.log('🔄 === useKnowledgeAssistant.openAssistant 调用结束 ===');
  }, [isOpen]);

  // 关闭助手
  const closeAssistant = useCallback(() => {
    console.log('❌ === useKnowledgeAssistant.closeAssistant 调用开始 ===');
    console.log('❌ 调用前 isOpen 状态:', isOpen);
    
    setIsOpen(false);
    console.log('❌ setIsOpen(false) 调用完成');
    
    // 取消正在进行的请求
    knowledgeRetrieval.cancelRequest?.();
    smartChat.cancelRequest?.();
    
    console.log('❌ === useKnowledgeAssistant.closeAssistant 调用结束 ===');
  }, [knowledgeRetrieval, smartChat, isOpen]);

  // 生成消息ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 增强的流式消息发送逻辑
  const sendMessage = useCallback(async (messageContent: string): Promise<void> => {
    if (!messageContent.trim() || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'user',
      content: messageContent.trim(),
      timestamp: new Date(),
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // 创建流式助手消息
    const streamingMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      isStreaming: true,
    };

    setMessages(prev => [...prev, streamingMessage]);

    try {
      console.log('🎯 === 开始增强流式对话处理 ===');
      console.log('📝 用户问题:', messageContent.substring(0, 100));

      // 第一步：意图检测
      console.log('🎯 步骤1: 意图检测...');
      const conversationContext = messages
        .slice(-4) // 最近4条消息作为上下文
        .map(msg => `${msg.type}: ${msg.content}`)
        .join('\n');

      const intentResponse = await fetch('/api/assistant/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageContent.trim(),
          conversationContext,
          projectId: config.datasetId?.split('-')[0] || 'unknown'
        })
      });

      if (!intentResponse.ok) {
        const errorData = await intentResponse.json();
        throw new Error(errorData.error || '意图检测失败');
      }

      const { intent } = await intentResponse.json();
      console.log('✅ 意图检测完成:', intent);

      // 更新消息状态显示意图检测结果
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { 
              ...msg, 
              content: `🎯 意图分析: ${intent.isKnowledgeBaseRelated ? '需要知识库检索' : '直接回答'} (置信度: ${(intent.confidence * 100).toFixed(1)}%)\n`,
              metadata: { ...msg.metadata, intentResult: intent }
            }
          : msg
      ));

      let knowledgeContext: any = null;

      // 第二步：条件处理
      if (intent.isKnowledgeBaseRelated && intent.confidence > 0.3) {
        console.log('🔍 步骤2: 知识库检索...');
        
        // 更新状态显示检索进度
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { 
                ...msg, 
                content: msg.content + '\n🔍 正在检索相关知识...',
              }
            : msg
        ));

        try {
          const retrievalResponse = await fetch('/api/assistant/knowledge/retrieve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              datasetId: config.datasetId,
              projectId: config.datasetId?.split('-')[0] || 'unknown',
              retrievalRequest: {
                query: messageContent.trim(),
                retrieval_model: {
                  search_method: 'hybrid_search',
                  top_k: config.retrievalTopK || 5,
                  score_threshold: config.scoreThreshold || 0.3,
                  score_threshold_enabled: true,
                  reranking_enable: true
                }
              }
            })
          });

          if (retrievalResponse.ok) {
            knowledgeContext = await retrievalResponse.json();
            console.log('✅ 知识库检索完成:', {
              recordCount: knowledgeContext.records?.length || 0,
              responseTime: knowledgeContext.metadata?.responseTime
            });

            // 更新状态显示检索结果
            const resultSummary = knowledgeContext.records?.length > 0 
              ? `找到 ${knowledgeContext.records.length} 条相关信息`
              : '未找到相关信息，将使用通用知识回答';
            
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessage.id 
                ? { 
                    ...msg, 
                    content: msg.content + `\n✅ ${resultSummary}`,
                    context: knowledgeContext.records
                  }
                : msg
            ));
          } else {
            console.warn('⚠️ 知识库检索失败，将使用直接回答模式');
            setMessages(prev => prev.map(msg => 
              msg.id === streamingMessage.id 
                ? { 
                    ...msg, 
                    content: msg.content + '\n⚠️ 知识库检索失败，使用通用模式回答',
                  }
                : msg
            ));
          }
        } catch (retrievalError) {
          console.error('知识库检索错误:', retrievalError);
        }
      } else {
        console.log('💬 步骤2: 直接回答模式');
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { 
                ...msg, 
                content: msg.content + '\n💬 使用通用知识直接回答',
              }
            : msg
        ));
      }

      // 第三步：流式响应生成
      console.log('🌊 步骤3: 开始流式响应生成...');
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { 
              ...msg, 
              content: msg.content + '\n\n🌊 正在生成回答...\n\n',
            }
          : msg
      ));

      const streamResponse = await fetch('/api/assistant/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageContent.trim(),
          conversationHistory: messages.slice(-6).map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          knowledgeContext,
          projectId: config.datasetId?.split('-')[0] || 'unknown',
          options: {
            model: config.aiModel || 'deepseek/deepseek-chat',
            temperature: 0.7,
            maxTokens: 2000
          }
        })
      });

      if (!streamResponse.ok) {
        throw new Error(`流式响应失败: ${streamResponse.status}`);
      }

      // 处理流式响应
      const reader = streamResponse.body?.getReader();
      if (!reader) {
        throw new Error('无法读取流式响应');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 处理完整的SSE事件
          while (true) {
            const lineEnd = buffer.indexOf('\n\n');
            if (lineEnd === -1) break;

            const eventData = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 2);

            if (eventData.startsWith('data: ')) {
              const data = eventData.slice(6);
              
              if (data === '[DONE]') {
                console.log('✅ 流式响应完成');
                break;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.type === 'content' && parsed.content) {
                  streamedContent += parsed.content;
                  
                  // 实时更新消息内容
                  setMessages(prev => prev.map(msg => 
                    msg.id === streamingMessage.id 
                      ? { 
                          ...msg, 
                          content: streamedContent,
                          isLoading: false,
                          isStreaming: true
                        }
                      : msg
                  ));
                } else if (parsed.type === 'complete') {
                  console.log('🎉 流式响应完成:', {
                    totalChunks: parsed.totalChunks,
                    responseLength: parsed.responseLength
                  });
                  
                  // 标记流式完成
                  setMessages(prev => prev.map(msg => 
                    msg.id === streamingMessage.id 
                      ? { 
                          ...msg, 
                          isStreaming: false,
                          isLoading: false
                        }
                      : msg
                  ));
                  break;
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.error || '流式响应处理错误');
                }
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError);
              }
            }
          }
        }

        // 确保最终状态正确
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { 
                ...msg, 
                content: streamedContent || '抱歉，未能生成有效回答。',
                isStreaming: false,
                isLoading: false,
                timestamp: new Date()
              }
            : msg
        ));

        lastMessageRef.current = {
          id: streamingMessage.id,
          type: 'assistant',
          content: streamedContent,
          timestamp: new Date(),
          context: knowledgeContext?.records,
          isLoading: false,
        };

      } finally {
        reader.cancel();
      }

    } catch (error) {
      console.error('❌ 增强流式对话错误:', error);
      
      const errorMessage = error instanceof Error ? error.message : '处理消息时出现未知错误';
      setError(errorMessage);

      // 更新为错误状态
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { 
              ...msg, 
              content: '',
              error: errorMessage,
              isLoading: false,
              isStreaming: false
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    generateMessageId,
    messages,
    config
  ]);

  // 重试最后一条消息
  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastMessageRef.current || isLoading) {
      return;
    }

    // 找到最后一条用户消息
    const lastUserMessage = [...messages]
      .reverse()
      .find(msg => msg.type === 'user');

    if (!lastUserMessage) {
      return;
    }

    // 移除最后一条助手消息（错误的）
    setMessages(prev => 
      prev.filter(msg => msg.id !== lastMessageRef.current?.id)
    );

    // 重新发送
    await sendMessage(lastUserMessage.content);
  }, [messages, isLoading, sendMessage]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    smartChat.clearHistory();
    lastMessageRef.current = null;
  }, [smartChat]);

  // 获取助手统计信息
  const getAssistantStats = useCallback(() => {
    const userMessages = messages.filter(m => m.type === 'user').length;
    const assistantMessages = messages.filter(m => m.type === 'assistant' && !m.error).length;
    const errorMessages = messages.filter(m => m.type === 'assistant' && m.error).length;
    
    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      errorMessages,
      conversationStats: smartChat.getConversationStats(),
    };
  }, [messages, smartChat]);

  // 导出对话
  const exportConversation = useCallback((format: 'txt' | 'json' = 'txt') => {
    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    }

    return messages
      .filter(msg => !msg.isLoading)
      .map(msg => {
        const time = msg.timestamp.toLocaleString();
        const role = msg.type === 'user' ? '用户' : '助手';
        const content = msg.error || msg.content;
        return `[${time}] ${role}: ${content}`;
      })
      .join('\n\n');
  }, [messages]);

  return {
    isOpen,
    messages,
    isLoading,
    error,
    openAssistant,
    closeAssistant,
    sendMessage,
    clearMessages,
    retryLastMessage,
    getAssistantStats,
    exportConversation,
  };
}

/**
 * 智能助手配置 Hook - 项目感知版本
 */
export function useAssistantConfig(initialConfig: Partial<AssistantConfig>) {
  // 使用传入的配置，而不是环境变量
  const [config, setConfig] = useState<AssistantConfig>(() => {
    const defaultConfig: AssistantConfig = {
      datasetId: '',
      difyApiKey: 'server-side-configured',
      difyBaseUrl: 'https://api.dify.ai/v1',
      openRouterApiKey: 'server-side-configured',
      aiModel: 'deepseek-chat',
      maxContextLength: 4000,
      retrievalTopK: 5,
      scoreThreshold: 0.3,
    };
    
    return { ...defaultConfig, ...initialConfig };
  });

  // 监听initialConfig变化并更新配置
  useEffect(() => {
    if (Object.keys(initialConfig).length > 0) {
      setConfig(prev => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  const updateConfig = useCallback((updates: Partial<AssistantConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const resetConfig = useCallback(() => {
    const defaultConfig: AssistantConfig = {
      datasetId: '',
      difyApiKey: 'server-side-configured',
      difyBaseUrl: 'https://api.dify.ai/v1',
      openRouterApiKey: 'server-side-configured',
      aiModel: 'deepseek-chat',
      maxContextLength: 4000,
      retrievalTopK: 5,
      scoreThreshold: 0.3,
    };
    
    setConfig({ ...defaultConfig, ...initialConfig });
  }, [initialConfig]);

  const validateConfig = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 核心必需配置
    if (!config.datasetId || config.datasetId.trim() === '') {
      errors.push('项目数据集ID不能为空');
    }

    if (!config.difyBaseUrl || config.difyBaseUrl.trim() === '') {
      errors.push('Dify API地址不能为空');
    }

    if (!config.aiModel || config.aiModel.trim() === '') {
      errors.push('AI模型不能为空');
    }

    // API密钥在服务端代理架构中不需要验证（服务端处理）
    // 只检查是否有占位符即可
    if (!config.difyApiKey) {
      errors.push('Dify API配置缺失');
    }

    if (!config.openRouterApiKey) {
      errors.push('AI API配置缺失');
    }

    // 数值范围验证
    if (config.maxContextLength && config.maxContextLength < 100) {
      errors.push('最大上下文长度不能少于100');
    }

    if (config.retrievalTopK && (config.retrievalTopK < 1 || config.retrievalTopK > 20)) {
      errors.push('检索结果数量应在1-20之间');
    }

    if (config.scoreThreshold !== undefined && (config.scoreThreshold < 0 || config.scoreThreshold > 1)) {
      errors.push('相关性阈值应在0-1之间');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [config]);

  return {
    config,
    updateConfig,
    resetConfig,
    validateConfig,
  };
}

/**
 * 智能助手性能监控 Hook
 */
export function useAssistantPerformance() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastRequestTime: null as Date | null,
  });

  const recordRequest = useCallback((
    success: boolean,
    responseTime: number
  ) => {
    setMetrics(prev => {
      const totalRequests = prev.totalRequests + 1;
      const successfulRequests = success ? prev.successfulRequests + 1 : prev.successfulRequests;
      const failedRequests = success ? prev.failedRequests : prev.failedRequests + 1;
      const totalResponseTime = prev.totalResponseTime + responseTime;
      const averageResponseTime = totalResponseTime / totalRequests;

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalResponseTime,
        lastRequestTime: new Date(),
      };
    });
  }, []);

  const getSuccessRate = useCallback(() => {
    return metrics.totalRequests > 0 
      ? (metrics.successfulRequests / metrics.totalRequests) * 100 
      : 0;
  }, [metrics]);

  const resetMetrics = useCallback(() => {
    setMetrics({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastRequestTime: null,
    });
  }, []);

  return {
    metrics,
    recordRequest,
    getSuccessRate,
    resetMetrics,
  };
}

export default useKnowledgeAssistant;