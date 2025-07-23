/**
 * 知识库检索 Hook
 */

import { useState, useCallback, useRef } from 'react';
import { KnowledgeAPI, getDefaultRetrievalConfig } from '@/lib/knowledge-api';
import { 
  DifyRetrievalRequest, 
  DifyRetrievalResponse,
  UseKnowledgeRetrievalReturn,
  AssistantConfig
} from '@/components/knowledge-assistant/types';

export function useKnowledgeRetrieval(config: AssistantConfig): UseKnowledgeRetrievalReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const apiRef = useRef<KnowledgeAPI | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // 初始化API实例
  if (!apiRef.current) {
    apiRef.current = new KnowledgeAPI(config.difyBaseUrl, config.difyApiKey);
  }

  // 检索知识库
  const retrieveKnowledge = useCallback(async (query: string): Promise<DifyRetrievalResponse> => {
    if (!query.trim()) {
      throw new Error('查询内容不能为空');
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const defaultConfig = getDefaultRetrievalConfig();
      const retrievalRequest: DifyRetrievalRequest = {
        query: query.trim(),
        retrieval_model: {
          search_method: defaultConfig?.search_method || 'semantic_search',
          top_k: config.retrievalTopK || 5,
          score_threshold: config.scoreThreshold || 0.3,
          score_threshold_enabled: config.scoreThreshold !== undefined,
          reranking_enable: defaultConfig?.reranking_enable || false,
        },
      };

      const result = await apiRef.current!.retrieveKnowledge(
        config.datasetId,
        retrievalRequest
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || '知识库检索失败');
      }

      // 过滤和排序结果
      const filteredResult = KnowledgeAPI.filterAndSortResults(result.data, {
        minScore: config.scoreThreshold || 0,
        maxResults: config.retrievalTopK || 5,
        deduplicateByDocument: true,
        sortBy: 'score',
      });

      return filteredResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '知识库检索失败';
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
    retrieveKnowledge,
    isLoading,
    error,
    clearError,
    cancelRequest,
  };
}

/**
 * 增强的知识检索 Hook，支持缓存和批量检索
 */
export function useEnhancedKnowledgeRetrieval(config: AssistantConfig) {
  const basicHook = useKnowledgeRetrieval(config);
  const [cache, setCache] = useState<Map<string, { data: DifyRetrievalResponse; timestamp: number }>>(new Map());
  const cacheTimeoutRef = useRef<number>(5 * 60 * 1000); // 5分钟缓存

  // 缓存检索结果
  const retrieveWithCache = useCallback(async (query: string): Promise<DifyRetrievalResponse> => {
    const cacheKey = query.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < cacheTimeoutRef.current) {
      return cached.data;
    }

    // 执行检索
    const result = await basicHook.retrieveKnowledge(query);
    
    // 更新缓存
    setCache(prev => new Map(prev.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    })));

    return result;
  }, [basicHook, cache]);

  // 批量检索
  const batchRetrieve = useCallback(async (queries: string[]): Promise<DifyRetrievalResponse[]> => {
    const results = await Promise.allSettled(
      queries.map(query => retrieveWithCache(query))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<DifyRetrievalResponse> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }, [retrieveWithCache]);

  // 清除缓存
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // 预加载常见问题
  const preloadCommonQuestions = useCallback(async (questions: string[]) => {
    try {
      await batchRetrieve(questions);
    } catch (error) {
      console.warn('Failed to preload common questions:', error);
    }
  }, [batchRetrieve]);

  return {
    ...basicHook,
    retrieveKnowledge: retrieveWithCache,
    batchRetrieve,
    clearCache,
    preloadCommonQuestions,
    cacheSize: cache.size,
  };
}

/**
 * 知识检索统计 Hook
 */
export function useKnowledgeRetrievalStats() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    cacheHits: 0,
    lastQueryTime: null as Date | null,
  });

  const recordQuery = useCallback((
    success: boolean, 
    responseTime: number, 
    fromCache: boolean = false
  ) => {
    setStats(prev => ({
      ...prev,
      totalQueries: prev.totalQueries + 1,
      successfulQueries: success ? prev.successfulQueries + 1 : prev.successfulQueries,
      failedQueries: success ? prev.failedQueries : prev.failedQueries + 1,
      totalResponseTime: prev.totalResponseTime + responseTime,
      averageResponseTime: (prev.totalResponseTime + responseTime) / (prev.totalQueries + 1),
      cacheHits: fromCache ? prev.cacheHits + 1 : prev.cacheHits,
      lastQueryTime: new Date(),
    }));
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      lastQueryTime: null,
    });
  }, []);

  const getSuccessRate = useCallback(() => {
    return stats.totalQueries > 0 ? (stats.successfulQueries / stats.totalQueries) * 100 : 0;
  }, [stats]);

  const getCacheHitRate = useCallback(() => {
    return stats.totalQueries > 0 ? (stats.cacheHits / stats.totalQueries) * 100 : 0;
  }, [stats]);

  return {
    stats,
    recordQuery,
    resetStats,
    getSuccessRate,
    getCacheHitRate,
  };
}

export default useKnowledgeRetrieval;