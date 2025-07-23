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

  // 发送消息
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

    // 创建加载中的助手消息
    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // 1. 检索知识库
      console.log('🔍 开始检索知识库...');
      const retrievalResult = await knowledgeRetrieval.retrieveKnowledge(messageContent);
      
      if (!retrievalResult.records || retrievalResult.records.length === 0) {
        throw new Error('没有找到相关的知识内容，请尝试换个问题。');
      }

      console.log('✅ 知识检索完成，找到', retrievalResult.records.length, '条相关内容');

      // 2. 生成AI回复
      console.log('🤖 正在生成AI回复...');
      const aiResponse = await smartChat.generateResponse(
        messageContent,
        retrievalResult,
        {
          stream: false, // 可以改为true启用流式回复
        }
      );

      console.log('✅ AI回复生成完成');

      // 3. 更新助手消息
      const assistantMessage: ChatMessage = {
        id: loadingMessage.id,
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        context: retrievalResult.records,
        isLoading: false,
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id ? assistantMessage : msg
        )
      );

      lastMessageRef.current = assistantMessage;
    } catch (error) {
      console.error('❌ 智能助手错误:', error);
      
      const errorMessage = error instanceof Error ? error.message : '处理消息时出现未知错误';
      setError(errorMessage);

      // 更新加载中的消息为错误消息
      const errorAssistantMessage: ChatMessage = {
        id: loadingMessage.id,
        type: 'assistant',
        content: '',
        timestamp: new Date(),
        error: errorMessage,
        isLoading: false,
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id ? errorAssistantMessage : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    generateMessageId,
    knowledgeRetrieval,
    smartChat
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