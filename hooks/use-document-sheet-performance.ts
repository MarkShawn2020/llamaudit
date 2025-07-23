/**
 * DocumentSheet 性能优化相关Hooks
 * 提供虚拟滚动、防抖搜索、预加载等性能优化功能
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { DocumentSegment } from '@/lib/api/dify-dataset-api-extended';

// 虚拟滚动配置
interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
}

// 虚拟滚动状态
interface VirtualScrollState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  visibleItems: any[];
  totalHeight: number;
}

/**
 * 虚拟滚动Hook
 * 用于处理大量分段数据的性能优化
 */
export function useVirtualScroll<T>(
  items: T[],
  config: VirtualScrollConfig
) {
  const [scrollState, setScrollState] = useState<VirtualScrollState>({
    scrollTop: 0,
    startIndex: 0,
    endIndex: 0,
    visibleItems: [],
    totalHeight: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见项目
  const calculateVisibleItems = useCallback((scrollTop: number) => {
    const { itemHeight, containerHeight, overscan } = config;
    const totalHeight = items.length * itemHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));

    return {
      scrollTop,
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
    };
  }, [items, config]);

  // 处理滚动事件
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const newState = calculateVisibleItems(scrollTop);
    setScrollState(newState);
  }, [calculateVisibleItems]);

  // 初始化和数据变化时重新计算
  useEffect(() => {
    const initialState = calculateVisibleItems(0);
    setScrollState(initialState);
  }, [calculateVisibleItems]);

  return {
    containerRef,
    scrollState,
    handleScroll,
    // 工具方法
    scrollToIndex: (index: number) => {
      if (containerRef.current) {
        const scrollTop = index * config.itemHeight;
        containerRef.current.scrollTop = scrollTop;
      }
    },
    scrollToTop: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    },
  };
}

/**
 * 防抖搜索Hook
 * 优化搜索请求性能
 */
export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  
  // 创建防抖函数
  const debouncedSetValue = useMemo(
    () => debounce((value: string) => {
      setDebouncedValue(value);
    }, delay),
    [delay]
  );

  // 更新搜索值
  const updateSearchValue = useCallback((value: string) => {
    setSearchValue(value);
    debouncedSetValue(value);
  }, [debouncedSetValue]);

  // 清理防抖函数
  useEffect(() => {
    return () => {
      debouncedSetValue.cancel();
    };
  }, [debouncedSetValue]);

  return {
    searchValue,
    debouncedValue,
    updateSearchValue,
    clearSearch: () => {
      setSearchValue('');
      setDebouncedValue('');
      debouncedSetValue.cancel();
    },
  };
}

/**
 * 预加载管理Hook
 * 管理文档数据的预加载策略
 */
export function usePreloadManager() {
  const queryClient = useQueryClient();
  const preloadedItems = useRef<Set<string>>(new Set());
  const preloadQueue = useRef<Array<{ datasetId: string; documentId: string }>>([]]);
  const isProcessingQueue = useRef(false);

  // 添加到预加载队列
  const addToPreloadQueue = useCallback((datasetId: string, documentId: string) => {
    const key = `${datasetId}:${documentId}`;
    
    if (preloadedItems.current.has(key)) {
      return; // 已经预加载过
    }

    preloadQueue.current.push({ datasetId, documentId });
    preloadedItems.current.add(key);
    
    // 处理队列
    processPreloadQueue();
  }, []);

  // 处理预加载队列
  const processPreloadQueue = useCallback(async () => {
    if (isProcessingQueue.current || preloadQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;

    try {
      // 批量处理预加载请求（最多3个并发）
      const batch = preloadQueue.current.splice(0, 3);
      
      await Promise.allSettled(
        batch.map(async ({ datasetId, documentId }) => {
          // 预加载文档详情
          await queryClient.prefetchQuery({
            queryKey: ['dify', 'dataset', datasetId, 'document', documentId],
            queryFn: () => {
              // 这里应该调用实际的API
              console.log(`Preloading document: ${datasetId}:${documentId}`);
              return Promise.resolve(null);
            },
            staleTime: 5 * 60 * 1000,
          });
        })
      );
    } catch (error) {
      console.warn('Preload batch failed:', error);
    } finally {
      isProcessingQueue.current = false;
      
      // 如果队列中还有项目，继续处理
      if (preloadQueue.current.length > 0) {
        setTimeout(processPreloadQueue, 100);
      }
    }
  }, [queryClient]);

  // 清除预加载缓存
  const clearPreloadCache = useCallback(() => {
    preloadedItems.current.clear();
    preloadQueue.current = [];
  }, []);

  return {
    addToPreloadQueue,
    clearPreloadCache,
    getPreloadedCount: () => preloadedItems.current.size,
    getQueueLength: () => preloadQueue.current.length,
  };
}

/**
 * 分段数据优化Hook
 * 优化大量分段数据的处理和渲染
 */
export function useSegmentsOptimization(segments: DocumentSegment[]) {
  // 分组分段数据以提高渲染性能
  const groupedSegments = useMemo(() => {
    const groups: { [key: string]: DocumentSegment[] } = {};
    
    segments.forEach((segment) => {
      const groupKey = segment.status || 'unknown';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(segment);
    });
    
    return groups;
  }, [segments]);

  // 统计信息
  const statistics = useMemo(() => {
    const stats = {
      total: segments.length,
      completed: 0,
      processing: 0,
      waiting: 0,
      error: 0,
      totalTokens: 0,
      totalWords: 0,
    };

    segments.forEach((segment) => {
      switch (segment.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'indexing':
          stats.processing++;
          break;
        case 'waiting':
          stats.waiting++;
          break;
        case 'error':
          stats.error++;
          break;
      }
      
      stats.totalTokens += segment.tokens || 0;
      stats.totalWords += segment.word_count || 0;
    });

    return stats;
  }, [segments]);

  // 筛选和排序
  const getFilteredSegments = useCallback((
    filter?: {
      status?: string[];
      minTokens?: number;
      maxTokens?: number;
      searchKeyword?: string;
    }
  ) => {
    let filtered = [...segments];

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        filtered = filtered.filter(s => filter.status!.includes(s.status));
      }

      if (filter.minTokens !== undefined) {
        filtered = filtered.filter(s => (s.tokens || 0) >= filter.minTokens!);
      }

      if (filter.maxTokens !== undefined) {
        filtered = filtered.filter(s => (s.tokens || 0) <= filter.maxTokens!);
      }

      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        filtered = filtered.filter(s => 
          s.content.toLowerCase().includes(keyword) ||
          s.keywords?.some(k => k.toLowerCase().includes(keyword))
        );
      }
    }

    return filtered;
  }, [segments]);

  return {
    groupedSegments,
    statistics,
    getFilteredSegments,
    // 工具方法
    getSegmentById: (id: string) => segments.find(s => s.id === id),
    getSegmentsByStatus: (status: string) => segments.filter(s => s.status === status),
    getSegmentsByTokenRange: (min: number, max: number) => 
      segments.filter(s => {
        const tokens = s.tokens || 0;
        return tokens >= min && tokens <= max;
      }),
  };
}

/**
 * 内存使用监控Hook
 * 监控组件的内存使用情况
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  } | null>(null);

  const updateMemoryInfo = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      setMemoryInfo({
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round(percentage),
      });
    }
  }, []);

  useEffect(() => {
    updateMemoryInfo();
    
    // 每5秒更新一次内存信息
    const interval = setInterval(updateMemoryInfo, 5000);
    
    return () => clearInterval(interval);
  }, [updateMemoryInfo]);

  return {
    memoryInfo,
    updateMemoryInfo,
    isHighMemoryUsage: memoryInfo ? memoryInfo.percentage > 80 : false,
  };
}

/**
 * 性能指标收集Hook
 * 收集和报告组件性能指标
 */
export function usePerformanceMetrics() {
  const metricsRef = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    totalRenderTime: 0,
  });

  // 记录渲染开始
  const markRenderStart = useCallback(() => {
    metricsRef.current.lastRenderTime = performance.now();
  }, []);

  // 记录渲染结束
  const markRenderEnd = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - metricsRef.current.lastRenderTime;
    
    metricsRef.current.renderCount++;
    metricsRef.current.totalRenderTime += renderTime;
    metricsRef.current.averageRenderTime = 
      metricsRef.current.totalRenderTime / metricsRef.current.renderCount;
    
    if (renderTime > metricsRef.current.maxRenderTime) {
      metricsRef.current.maxRenderTime = renderTime;
    }
  }, []);

  // 获取性能报告
  const getPerformanceReport = useCallback(() => {
    return {
      ...metricsRef.current,
      // 添加性能评级
      performanceGrade: (() => {
        const avgTime = metricsRef.current.averageRenderTime;
        if (avgTime < 16) return 'A'; // 60fps
        if (avgTime < 33) return 'B'; // 30fps
        if (avgTime < 50) return 'C'; // 20fps
        return 'D'; // < 20fps
      })(),
    };
  }, []);

  // 重置指标
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      totalRenderTime: 0,
    };
  }, []);

  return {
    markRenderStart,
    markRenderEnd,
    getPerformanceReport,
    resetMetrics,
  };
}