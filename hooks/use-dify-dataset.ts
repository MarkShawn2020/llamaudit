'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    enabled: enabled && !!datasetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // 如果是404错误（知识库不存在），不重试
      if (error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
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

  return useQuery({
    queryKey: QUERY_KEYS.datasetDocuments(datasetId || ''),
    queryFn: () => api.getDatasetDocuments(datasetId!),
    enabled: enabled && !!datasetId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: (query) => {
      // 如果有文档正在处理，则更频繁地轮询
      const data = query.state.data;
      const hasProcessingDocs = data?.data?.some(doc => 
        doc.indexing_status === 'waiting' || doc.indexing_status === 'indexing'
      );
      return hasProcessingDocs ? 3000 : false; // 3秒轮询或不轮询
    },
  });
}

export function useCreateDocumentByFile() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();

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
      toast.success('文档上传成功，正在处理中...');
      // 刷新文档列表
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(variables.datasetId)
      });
    },
    onError: (error: Error) => {
      console.error('上传文档失败:', error);
      toast.error(`上传文档失败: ${error.message}`);
    },
  });
}

export function useDeleteDocument() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ datasetId, documentId }: { datasetId: string; documentId: string }) =>
      api.deleteDocument(datasetId, documentId),
    onSuccess: (_, variables) => {
      toast.success('文档删除成功');
      // 刷新文档列表
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(variables.datasetId)
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

  const ensureDataset = async (datasetId?: string): Promise<string> => {
    if (datasetId) {
      // 检查知识库是否存在
      try {
        await api.getDatasetDetails(datasetId);
        return datasetId;
      } catch (error) {
        console.warn(`知识库 ${datasetId} 不存在，将创建新的知识库`);
      }
    }

    // 创建新知识库
    const newDataset = await createDataset.mutateAsync({
      name: `${projectName}-知识库`,
      description: `项目"${projectName}"的专用知识库`,
      indexing_technique: 'high_quality',
      permission: 'only_me',
    });

    return newDataset.id;
  };

  return {
    ensureDataset,
    isCreating: createDataset.isPending,
    createError: createDataset.error,
  };
}