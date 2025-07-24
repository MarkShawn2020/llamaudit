'use client';

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  getDatasetDetails,
  createDataset,
  getDatasetDocuments,
  createDocumentByFile,
  deleteDocument,
  deleteDataset,
  getDocumentIndexingStatus,
  batchGetDatasetDocuments,
  testDifyConnection,
} from '@/lib/actions/dify-actions';
import type {
  DifyDataset,
  DifyDocument,
  CreateDatasetPayload,
  CreateDocumentResponse,
} from '@/lib/api/dify-dataset-api';

const QUERY_KEYS = {
  datasetDetails: (datasetId: string) => ['dify', 'dataset', datasetId] as const,
  datasetDocuments: (datasetId: string) => ['dify', 'dataset', datasetId, 'documents'] as const,
  documentIndexingStatus: (datasetId: string, batch: string) => ['dify', 'dataset', datasetId, 'batch', batch, 'status'] as const,
  connectionTest: () => ['dify', 'connection-test'] as const,
} as const;

/**
 * 获取数据集详情的Hook
 */
export function useDatasetDetails(datasetId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: QUERY_KEYS.datasetDetails(datasetId || ''),
    queryFn: () => getDatasetDetails(datasetId!),
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

/**
 * 创建数据集的Hook
 */
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDatasetPayload) => createDataset(payload),
    onSuccess: (data) => {
      // 缓存新创建的数据集详情
      queryClient.setQueryData(
        QUERY_KEYS.datasetDetails(data.id),
        data
      );
      
      toast.success('数据集创建成功', {
        description: `数据集 "${data.name}" 已创建`
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '创建数据集失败';
      toast.error('创建数据集失败', {
        description: errorMessage
      });
    },
  });
}

/**
 * 获取数据集文档列表的Hook（无限滚动）
 */
export function useDatasetDocuments(datasetId?: string, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.datasetDocuments(datasetId || ''),
    queryFn: ({ pageParam = 1 }) => 
      getDatasetDocuments(datasetId!, pageParam, 50),
    enabled: enabled && !!datasetId && datasetId !== '',
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        // 计算下一页页码
        const currentPage = Math.floor(lastPage.data.length / lastPage.limit) + 1;
        return currentPage + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000, // 30秒内认为数据是新鲜的
    retry: (failureCount, error) => {
      if (error.message.includes('404') || 
          error.message.includes('401') || 
          error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * 上传文档的Hook
 */
export function useCreateDocumentByFile(datasetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      file, 
      options = {} 
    }: { 
      file: File; 
      options?: {
        indexing_technique?: 'high_quality' | 'economy';
        process_mode?: 'automatic' | 'custom';
      };
    }) => {
      // 将File转换为ArrayBuffer用于传输到server action
      const arrayBuffer = await file.arrayBuffer();
      return createDocumentByFile(datasetId, arrayBuffer, file.name, options);
    },
    onSuccess: (data, variables) => {
      // 使查询失效，触发重新获取
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId)
      });
      
      // 也使数据集详情失效，更新文档数量等统计信息
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDetails(datasetId)
      });
      
      toast.success('文档上传成功', {
        description: `文档 "${variables.file.name}" 已添加到数据集`
      });
    },
    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : '文档上传失败';
      toast.error('文档上传失败', {
        description: `${variables.file.name}: ${errorMessage}`
      });
    },
  });
}

/**
 * 删除文档的Hook
 */
export function useDeleteDocument(datasetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(datasetId, documentId),
    onSuccess: (_, documentId) => {
      // 使查询失效，触发重新获取
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId)
      });
      
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDetails(datasetId)
      });
      
      toast.success('文档删除成功');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '文档删除失败';
      toast.error('文档删除失败', {
        description: errorMessage
      });
    },
  });
}

/**
 * 删除数据集的Hook
 */
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datasetId: string) => deleteDataset(datasetId),
    onSuccess: (_, datasetId) => {
      // 清除相关的所有查询缓存
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.datasetDetails(datasetId)
      });
      
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId)
      });
      
      toast.success('数据集删除成功');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '数据集删除失败';
      toast.error('数据集删除失败', {
        description: errorMessage
      });
    },
  });
}

/**
 * 获取文档索引状态的Hook
 */
export function useDocumentIndexingStatus(
  datasetId: string, 
  batch: string, 
  enabled: boolean = true,
  options: {
    pollingInterval?: number;
    onCompleted?: (data: any) => void;
  } = {}
) {
  const { pollingInterval = 2000, onCompleted } = options;

  const query = useQuery({
    queryKey: QUERY_KEYS.documentIndexingStatus(datasetId, batch),
    queryFn: () => getDocumentIndexingStatus(datasetId, batch),
    enabled: enabled && !!datasetId && !!batch,
    refetchInterval: (data: any) => {
      // 如果索引完成，停止轮询
      if (!data) return pollingInterval;
      
      const status = data.indexing_status;
      if (status === 'completed' || status === 'error') {
        if (status === 'completed' && onCompleted) {
          onCompleted(data);
        }
        return false;
      }
      return pollingInterval;
    },
    staleTime: 0, // 索引状态需要实时更新
    retry: 2,
  });

  return query;
}

/**
 * 项目数据集管理Hook（高级功能）
 */
export function useProjectDataset(projectId: string, projectName: string) {
  const createDatasetMutation = useCreateDataset();
  const deleteDatasetMutation = useDeleteDataset();

  const ensureDataset = useCallback(async (existingDatasetId?: string): Promise<string | null> => {
    try {
      if (existingDatasetId) {
        // 验证现有数据集是否存在
        const details = await getDatasetDetails(existingDatasetId);
        return details.id;
      }

      // 创建新数据集
      const timestamp = Date.now();
      const datasetName = `proj-${projectId.slice(0, 8)}-${projectName}-kb-${timestamp}`;
      
      const dataset = await createDatasetMutation.mutateAsync({
        name: datasetName,
        description: `项目"${projectName}"的专用知识库`,
        indexing_technique: 'high_quality',
        permission: 'only_me',
      });

      return dataset.id;
    } catch (error) {
      console.error('确保数据集存在失败:', error);
      return null;
    }
  }, [projectId, projectName, createDatasetMutation]);

  return {
    ensureDataset,
    isCreating: createDatasetMutation.isPending,
    isDeleting: deleteDatasetMutation.isPending,
    createError: createDatasetMutation.error,
    deleteError: deleteDatasetMutation.error,
  };
}

/**
 * Dify连接测试Hook
 */
export function useDifyConnectionTest() {
  return useMutation({
    mutationFn: testDifyConnection,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('连接测试成功', {
          description: result.message
        });
      } else {
        toast.error('连接测试失败', {
          description: result.message
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : '连接测试失败';
      toast.error('连接测试失败', {
        description: errorMessage
      });
    },
  });
}

/**
 * 批量数据集文档Hook（用于仪表板等需要多个数据集数据的场景）
 */
export function useBatchDatasetDocuments(datasetIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['dify', 'batch-documents', ...datasetIds.sort()],
    queryFn: () => batchGetDatasetDocuments(datasetIds),
    enabled: enabled && datasetIds.length > 0,
    staleTime: 60 * 1000, // 1分钟
    retry: 1,
  });
}