'use client';

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useDifyConfig } from '@/contexts/dify-config-context';
import {
  DifyDatasetAPI,
  type DifyDataset,
  type DifyDocument,
  type CreateDatasetPayload,
  type CreateDocumentResponse,
} from '@/lib/api/dify-dataset-api';

const QUERY_KEYS = {
  datasetDetails: (datasetId: string) => ['dify', 'dataset', datasetId] as const,
  datasetDocuments: (datasetId: string) => ['dify', 'dataset', datasetId, 'documents'] as const,
  documentIndexingStatus: (datasetId: string, batch: string) => ['dify', 'dataset', datasetId, 'batch', batch, 'status'] as const,
} as const;

export function useDifyDatasetAPI() {
  const { config } = useDifyConfig();
  return new DifyDatasetAPI(config);
}

export function useDatasetDetails(datasetId: string | undefined, enabled = true) {
  const api = useDifyDatasetAPI();

  return useQuery({
    queryKey: QUERY_KEYS.datasetDetails(datasetId || ''),
    queryFn: () => api.getDatasetDetails(datasetId!),
    enabled: enabled && !!datasetId && datasetId !== '',
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      // 更严格的错误检查，避免无意义的重试
      if (error.message.includes('404') || 
          error.message.includes('401') || 
          error.message.includes('403') ||
          !datasetId || datasetId === '') {
        return false;
      }
      return failureCount < 2; // 减少重试次数
    },
  });
}

export function useCreateDataset() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDatasetPayload) => api.createDataset(payload),
    onSuccess: (data) => {
      toast.success('知识库创建成功');
      // 添加到查询缓存
      queryClient.setQueryData(QUERY_KEYS.datasetDetails(data.id), data);
    },
    onError: (error: Error) => {
      console.error('创建知识库失败:', error);
      toast.error(`创建知识库失败: ${error.message}`);
    },
  });
}

export function useDatasetDocuments(datasetId: string | undefined, enabled = true) {
  const api = useDifyDatasetAPI();

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.datasetDocuments(datasetId || ''),
    queryFn: ({ pageParam = 1 }) => api.getDatasetDocuments(datasetId!, pageParam, 50), // 增加每页数量到50
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // 如果当前页的数据数量小于限制，说明没有更多数据了
      if (lastPage.data.length < 50) {
        return undefined;
      }
      return (lastPageParam as number) + 1;
    },
    enabled: enabled && !!datasetId && datasetId !== '',
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      // 避免无意义的重试
      if (error.message.includes('404') || 
          error.message.includes('401') || 
          error.message.includes('403') ||
          !datasetId || datasetId === '') {
        return false;
      }
      return failureCount < 2;
    },
    refetchInterval: (query) => {
      // 如果查询出错、没有数据或datasetId无效，停止轮询
      if (query.state.error || !query.state.data || !datasetId || datasetId === '') {
        return false;
      }
      
      const pages = query.state.data?.pages || [];
      const allDocs = pages.flatMap(page => page.data);
      
      // 如果没有文档，停止轮询
      if (allDocs.length === 0) {
        return false;
      }
      
      const processingStatuses = ['waiting', 'queuing', 'indexing', 'splitting', 'processing'];
      const hasProcessingDocs = allDocs.some((doc: DifyDocument) => 
        processingStatuses.includes(doc.indexing_status)
      );
      
      // 对于刚上传的文档，在前2分钟内保持更频繁的轮询
      const now = Date.now();
      const twoMinutesAgo = now - 2 * 60 * 1000;
      
      const recentDocs = allDocs.some((doc: DifyDocument) => {
        if (!doc.created_at) return false;
        
        // 处理时间戳：如果是Unix时间戳（小于JavaScript时间戳），需要乘以1000
        const timestamp = doc.created_at < 1000000000000 ? doc.created_at * 1000 : doc.created_at;
        const createdTime = new Date(timestamp).getTime();
        
        // 验证时间戳是否有效
        if (isNaN(createdTime)) return false;
        
        const isRecent = createdTime > twoMinutesAgo;
        const isNotCompleted = doc.indexing_status !== 'completed';
        return isRecent && isNotCompleted;
      });
      
      // 只有在有处理中的文档或最近上传的未完成文档时才轮询
      const shouldPoll = hasProcessingDocs || recentDocs;
      
      // 添加调试日志
      if (shouldPoll && allDocs.length > 0) {
        console.log('轮询状态:', {
          hasProcessingDocs,
          recentDocs,
          docCount: allDocs.length,
          processingCount: allDocs.filter(doc => processingStatuses.includes(doc.indexing_status)).length
        });
      }
      
      return shouldPoll ? 2000 : false; // 2秒轮询或不轮询
    },
  });
}

export function useCreateDocumentByFile() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖失效函数
  const debouncedInvalidate = useCallback((datasetId: string) => {
    // 清除之前的定时器
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    
    // 设置新的定时器，延迟500ms执行失效
    invalidateTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId)
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDetails(datasetId)
      });
    }, 500);
  }, [queryClient]);

  return useMutation({
    mutationFn: ({ 
      datasetId, 
      file, 
      options = {} 
    }: { 
      datasetId: string; 
      file: File; 
      options?: { indexing_technique?: 'high_quality' | 'economy'; process_mode?: 'automatic' | 'custom' } 
    }) => api.createDocumentByFile(datasetId, file, options),
    onSuccess: (data, variables) => {
      // 检测是否为重复文档
      const isDuplicate = detectDuplicateDocument(data, variables.file);
      
      if (isDuplicate) {
        toast.info(`文档 "${variables.file.name}" 已存在，已跳过重复上传`, {
          description: '系统检测到相同内容的文档已存在于知识库中',
          duration: 4000,
        });
      } else {
        toast.success(`文档 "${variables.file.name}" 上传成功，正在处理中...`);
      }
      
      // 使用防抖失效，避免频繁的缓存更新
      debouncedInvalidate(variables.datasetId);
    },
    onError: (error: Error) => {
      console.error('上传文档失败:', error);
      toast.error(`上传文档失败: ${error.message}`);
    },
  });
}

// 检测重复文档的辅助函数
function detectDuplicateDocument(response: any, uploadedFile: File): boolean {
  // 方法1: 检查响应中的重复标识
  if (response.duplicated === true || response.is_duplicate === true) {
    return true;
  }
  
  // 方法2: 检查文档创建时间（如果文档创建时间早于上传时间，可能是重复）
  if (response.document?.created_at) {
    const docCreatedTime = new Date(response.document.created_at * 1000); // 假设是Unix时间戳
    const uploadTime = new Date();
    const timeDiff = uploadTime.getTime() - docCreatedTime.getTime();
    
    // 如果文档创建时间早于5分钟前，可能是重复文档
    if (timeDiff > 5 * 60 * 1000) {
      return true;
    }
  }
  
  // 方法3: 检查batch字段（可能为空或特殊值表示重复）
  if (!response.batch || response.batch === 'duplicate' || response.batch === '') {
    return true;
  }
  
  // 方法4: 检查文档状态（已完成的文档可能表示是重复的）
  if (response.document?.indexing_status === 'completed') {
    return true;
  }
  
  return false;
}

export function useDeleteDocument() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ datasetId, documentId }: { datasetId: string; documentId: string }) =>
      api.deleteDocument(datasetId, documentId),
    onSuccess: (_, variables) => {
      toast.success('文档删除成功');
      // 同时刷新文档列表和知识库详情，确保数据一致性
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(variables.datasetId)
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDetails(variables.datasetId)
      });
    },
    onError: (error: Error) => {
      console.error('删除文档失败:', error);
      toast.error(`删除文档失败: ${error.message}`);
    },
  });
}

export function useDocumentIndexingStatus(datasetId: string | undefined, batch: string | undefined, enabled = true) {
  const api = useDifyDatasetAPI();

  return useQuery({
    queryKey: QUERY_KEYS.documentIndexingStatus(datasetId || '', batch || ''),
    queryFn: () => api.getDocumentIndexingStatus(datasetId!, batch!),
    enabled: enabled && !!datasetId && !!batch,
    refetchInterval: 3000, // 每3秒检查一次状态
    staleTime: 0, // 总是重新获取
  });
}

// 组合 hook：项目知识库管理
export function useProjectDataset(projectId: string, projectName: string) {
  const createDataset = useCreateDataset();
  const queryClient = useQueryClient();
  const api = useDifyDatasetAPI();

  const ensureDataset = useCallback(async (datasetId?: string): Promise<string> => {
    if (datasetId) {
      // 检查知识库是否存在
      try {
        await api.getDatasetDetails(datasetId);
        return datasetId;
      } catch (error) {
        console.warn(`知识库 ${datasetId} 不存在，将创建新的知识库`);
      }
    }

    // 使用项目ID确保知识库名称全局唯一，避免命名冲突
    const uniqueDatasetName = `proj-${projectId.slice(0, 8)}-${projectName}-kb`;
    const fallbackDatasetName = `proj-${projectId}-kb-${Date.now()}`;

    try {
      // 创建新知识库 - 直接调用mutateAsync，避免依赖mutation对象
      const newDataset = await createDataset.mutateAsync({
        name: uniqueDatasetName,
        description: `项目"${projectName}"的专用知识库（ID: ${projectId}）`,
        indexing_technique: 'high_quality',
        permission: 'only_me',
      });

      return newDataset.id;
    } catch (error: any) {
      // 如果还是遇到命名冲突，使用带时间戳的后备名称
      if (error.message?.includes('already exists')) {
        console.warn(`知识库名称 ${uniqueDatasetName} 仍然冲突，使用后备名称`);
        const newDataset = await createDataset.mutateAsync({
          name: fallbackDatasetName,
          description: `项目"${projectName}"的专用知识库（ID: ${projectId}）`,
          indexing_technique: 'high_quality',
          permission: 'only_me',
        });

        return newDataset.id;
      }
      throw error;
    }
  }, [projectId, projectName, api, createDataset]);

  return {
    ensureDataset,
    isCreating: createDataset.isPending,
    createError: createDataset.error,
  };
}