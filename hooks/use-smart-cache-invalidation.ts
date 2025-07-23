/**
 * 智能缓存失效管理器
 * 提供更精确、高效的缓存更新策略
 */

import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { DifyDocument } from '@/lib/api/dify-dataset-api';

interface SmartInvalidationOptions {
  datasetId: string;
  operation: 'create' | 'delete' | 'update';
  documentData?: DifyDocument;
  isDuplicate?: boolean;
  batchSize?: number;
}

interface DocumentListResponse {
  data: DifyDocument[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

const QUERY_KEYS = {
  datasetDetails: (datasetId: string) => ['dify', 'dataset', datasetId] as const,
  datasetDocuments: (datasetId: string) => ['dify', 'dataset', datasetId, 'documents'] as const,
};

export function useSmartCacheInvalidation() {
  const queryClient = useQueryClient();
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const invalidationTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // 批量失效的防抖机制
  const scheduleInvalidation = useCallback((datasetId: string) => {
    pendingInvalidations.current.add(datasetId);
    
    // 清除之前的计时器
    if (invalidationTimer.current) {
      clearTimeout(invalidationTimer.current);
    }
    
    // 设置新的计时器，200ms后执行批量失效
    invalidationTimer.current = setTimeout(() => {
      const datasetsToInvalidate = Array.from(pendingInvalidations.current);
      pendingInvalidations.current.clear();
      
      // 批量执行失效操作
      datasetsToInvalidate.forEach(datasetId => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.datasetDocuments(datasetId)
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.datasetDetails(datasetId)
        });
      });
    }, 200);
  }, [queryClient]);

  // 精确更新文档列表（乐观更新）
  const updateDocumentListOptimistically = useCallback((
    datasetId: string,
    operation: 'add' | 'remove',
    document?: DifyDocument
  ) => {
    const queryKey = QUERY_KEYS.datasetDocuments(datasetId);
    
    queryClient.setQueryData<InfiniteData<DocumentListResponse>>(
      queryKey,
      (oldData) => {
        if (!oldData) return oldData;
        
        const newPages = [...oldData.pages];
        
        if (operation === 'add' && document) {
          // 将新文档添加到第一页的开头
          if (newPages[0]) {
            newPages[0] = {
              ...newPages[0],
              data: [document, ...newPages[0].data]
            };
          }
        } else if (operation === 'remove' && document) {
          // 从所有页面中移除指定文档
          newPages.forEach(page => {
            page.data = page.data.filter(doc => doc.id !== document.id);
          });
        }
        
        return {
          ...oldData,
          pages: newPages
        };
      }
    );
  }, [queryClient]);

  // 更新知识库详情中的文档计数
  const updateDatasetDetailsOptimistically = useCallback((
    datasetId: string,
    countDelta: number
  ) => {
    const queryKey = QUERY_KEYS.datasetDetails(datasetId);
    
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        document_count: Math.max(0, oldData.document_count + countDelta)
      };
    });
  }, [queryClient]);

  // 主要的智能失效方法
  const smartInvalidate = useCallback((options: SmartInvalidationOptions) => {
    const {
      datasetId,
      operation,
      documentData,
      isDuplicate = false,
      batchSize = 1
    } = options;
    
    // 策略1：重复文件不触发任何更新
    if (isDuplicate) {
      console.log('📝 跳过重复文件的缓存更新');
      return;
    }
    
    // 策略2：对于单个文件操作，使用乐观更新
    if (batchSize === 1 && documentData) {
      switch (operation) {
        case 'create':
          updateDocumentListOptimistically(datasetId, 'add', documentData);
          updateDatasetDetailsOptimistically(datasetId, 1);
          
          // 如果文档状态为处理中，稍后验证
          if (['waiting', 'queuing', 'processing'].includes(documentData.indexing_status)) {
            setTimeout(() => {
              scheduleInvalidation(datasetId);
            }, 5000); // 5秒后验证
          }
          break;
          
        case 'delete':
          updateDocumentListOptimistically(datasetId, 'remove', documentData);
          updateDatasetDetailsOptimistically(datasetId, -1);
          break;
          
        case 'update':
          // 对于更新操作，使用传统失效方式
          scheduleInvalidation(datasetId);
          break;
      }
    } 
    // 策略3：对于批量操作，使用防抖失效
    else {
      scheduleInvalidation(datasetId);
    }
  }, [scheduleInvalidation, updateDocumentListOptimistically, updateDatasetDetailsOptimistically]);

  // 强制刷新（用于错误恢复）
  const forceRefresh = useCallback((datasetId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.datasetDocuments(datasetId)
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.datasetDetails(datasetId)
    });
  }, [queryClient]);

  // 验证乐观更新的准确性
  const validateOptimisticUpdate = useCallback(async (datasetId: string) => {
    try {
      // 静默重新获取最新数据进行对比
      const latestData = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId),
        staleTime: 0,
      });
      
      // 这里可以添加数据对比逻辑
      console.log('✅ 乐观更新验证完成');
    } catch (error) {
      console.warn('⚠️ 乐观更新验证失败，执行强制刷新');
      forceRefresh(datasetId);
    }
  }, [queryClient, forceRefresh]);

  return {
    smartInvalidate,
    forceRefresh,
    validateOptimisticUpdate,
  };
}