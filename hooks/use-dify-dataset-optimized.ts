/**
 * 优化版的Dify数据集Hook
 * 集成了智能缓存失效和乐观更新机制
 */

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDifyConfig } from '@/contexts/dify-config-context';
import {
  DifyDatasetAPI,
  type DifyDataset,
  type DifyDocument,
  type CreateDatasetPayload,
  type CreateDocumentResponse,
} from '@/lib/api/dify-dataset-api';
import { useSmartCacheInvalidation } from './use-smart-cache-invalidation';

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
    staleTime: 2 * 60 * 1000, // 2分钟
    retry: (failureCount, error) => {
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
    queryFn: ({ pageParam = 1 }) => api.getDatasetDocuments(datasetId!, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.data.length < 50) {
        return undefined;
      }
      return (lastPageParam as number) + 1;
    },
    enabled: enabled && !!datasetId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages || [];
      const allDocs = pages.flatMap(page => page.data);
      const processingStatuses = ['waiting', 'queuing', 'indexing', 'splitting', 'processing'];
      const hasProcessingDocs = allDocs.some((doc: DifyDocument) => 
        processingStatuses.includes(doc.indexing_status)
      );
      
      const recentDocs = allDocs.some((doc: DifyDocument) => {
        const createdTime = new Date(doc.created_at || 0).getTime();
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        const isRecent = createdTime > twoMinutesAgo;
        const isNotCompleted = doc.indexing_status !== 'completed';
        return isRecent && isNotCompleted;
      });
      
      return hasProcessingDocs || recentDocs ? 2000 : false;
    },
  });
}

export function useCreateDocumentByFileOptimized() {
  const api = useDifyDatasetAPI();
  const { smartInvalidate } = useSmartCacheInvalidation();

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
        
        // 智能失效：重复文件不触发缓存更新
        smartInvalidate({
          datasetId: variables.datasetId,
          operation: 'create',
          isDuplicate: true
        });
      } else {
        toast.success(`文档 "${variables.file.name}" 上传成功，正在处理中...`);
        
        // 智能失效：使用乐观更新
        smartInvalidate({
          datasetId: variables.datasetId,
          operation: 'create',
          documentData: data.document,
          isDuplicate: false
        });
      }
    },
    onError: (error: Error) => {
      console.error('上传文档失败:', error);
      toast.error(`上传文档失败: ${error.message}`);
    },
  });
}

export function useDeleteDocumentOptimized() {
  const api = useDifyDatasetAPI();
  const queryClient = useQueryClient();
  const { smartInvalidate } = useSmartCacheInvalidation();

  return useMutation({
    mutationFn: ({ datasetId, documentId }: { datasetId: string; documentId: string }) =>
      api.deleteDocument(datasetId, documentId),
    onMutate: async ({ datasetId, documentId }) => {
      // 乐观更新：立即从UI中移除文档
      const queryKey = QUERY_KEYS.datasetDocuments(datasetId);
      
      // 取消正在进行的重新获取
      await queryClient.cancelQueries({ queryKey });
      
      // 保存当前数据用于回滚
      const previousData = queryClient.getQueryData(queryKey);
      
      // 找到要删除的文档信息
      const currentData = queryClient.getQueryData<any>(queryKey);
      let documentToDelete: DifyDocument | undefined;
      
      if (currentData?.pages) {
        for (const page of currentData.pages) {
          const doc = page.data.find((d: DifyDocument) => d.id === documentId);
          if (doc) {
            documentToDelete = doc;
            break;
          }
        }
      }
      
      // 乐观更新：从列表中移除文档
      if (documentToDelete) {
        smartInvalidate({
          datasetId,
          operation: 'delete',
          documentData: documentToDelete
        });
      }
      
      return { previousData, documentToDelete };
    },
    onSuccess: (_, variables, context) => {
      toast.success('文档删除成功');
      // 乐观更新已经完成，不需要额外的失效操作
    },
    onError: (error: Error, variables, context) => {
      console.error('删除文档失败:', error);
      toast.error(`删除文档失败: ${error.message}`);
      
      // 回滚乐观更新
      if (context?.previousData) {
        queryClient.setQueryData(
          QUERY_KEYS.datasetDocuments(variables.datasetId),
          context.previousData
        );
      }
    },
  });
}

// 批量上传的优化Hook
export function useBatchCreateDocuments() {
  const api = useDifyDatasetAPI();
  const { smartInvalidate } = useSmartCacheInvalidation();

  return useMutation({
    mutationFn: async ({ 
      datasetId, 
      files 
    }: { 
      datasetId: string; 
      files: File[] 
    }) => {
      // 并行上传所有文件
      const uploadPromises = files.map(file =>
        api.createDocumentByFile(datasetId, file, {
          indexing_technique: 'high_quality',
          process_mode: 'automatic'
        }).catch(error => ({ error, file }))
      );
      
      const results = await Promise.allSettled(uploadPromises);
      
      return results.map((result, index) => ({
        file: files[index],
        result: result.status === 'fulfilled' ? result.value : result.reason
      }));
    },
    onSuccess: (results, variables) => {
      const successful = results.filter(r => !('error' in r.result));
      const failed = results.filter(r => 'error' in r.result);
      const duplicates = successful.filter(r => 
        detectDuplicateDocument(r.result as CreateDocumentResponse, r.file)
      );
      
      // 显示批量结果摘要
      const successCount = successful.length - duplicates.length;
      const duplicateCount = duplicates.length;
      const failCount = failed.length;
      
      if (successCount > 0) {
        toast.success(`成功上传 ${successCount} 个文件`);
      }
      if (duplicateCount > 0) {
        toast.info(`跳过 ${duplicateCount} 个重复文件`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} 个文件上传失败`);
      }
      
      // 智能失效：批量操作使用防抖失效
      if (successCount > 0) {
        smartInvalidate({
          datasetId: variables.datasetId,
          operation: 'create',
          batchSize: successCount
        });
      }
    },
    onError: (error: Error) => {
      console.error('批量上传失败:', error);
      toast.error('批量上传失败，请重试');
    },
  });
}

// 检测重复文档的辅助函数（保持与原版本一致）
function detectDuplicateDocument(response: any, uploadedFile: File): boolean {
  if (response.duplicated === true || response.is_duplicate === true) {
    return true;
  }
  
  if (response.document?.created_at) {
    const docCreatedTime = new Date(response.document.created_at * 1000);
    const uploadTime = new Date();
    const timeDiff = uploadTime.getTime() - docCreatedTime.getTime();
    
    if (timeDiff > 5 * 60 * 1000) {
      return true;
    }
  }
  
  if (!response.batch || response.batch === 'duplicate' || response.batch === '') {
    return true;
  }
  
  if (response.document?.indexing_status === 'completed') {
    return true;
  }
  
  return false;
}

export function useDocumentIndexingStatus(datasetId: string | undefined, batch: string | undefined, enabled = true) {
  const api = useDifyDatasetAPI();

  return useQuery({
    queryKey: QUERY_KEYS.documentIndexingStatus(datasetId || '', batch || ''),
    queryFn: () => api.getDocumentIndexingStatus(datasetId!, batch!),
    enabled: enabled && !!datasetId && !!batch,
    refetchInterval: 3000,
    staleTime: 0,
  });
}

// 组合 hook：项目知识库管理
export function useProjectDataset(projectId: string, projectName: string) {
  const createDataset = useCreateDataset();
  const queryClient = useQueryClient();
  const api = useDifyDatasetAPI();

  const ensureDataset = async (datasetId?: string): Promise<string> => {
    if (datasetId) {
      try {
        await api.getDatasetDetails(datasetId);
        return datasetId;
      } catch (error) {
        console.warn(`知识库 ${datasetId} 不存在，将创建新的知识库`);
      }
    }

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