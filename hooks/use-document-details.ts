/**
 * 文档详情相关的React Query Hooks
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDifyConfig } from '@/contexts/dify-config-context';
import { 
  ExtendedDifyDatasetAPI, 
  ExtendedDocumentDetails, 
  DocumentSegment, 
  DocumentSegmentListResponse 
} from '@/lib/api/dify-dataset-api-extended';

// 查询键定义
const DOCUMENT_QUERY_KEYS = {
  documentDetails: (datasetId: string, documentId: string) => 
    ['dify', 'dataset', datasetId, 'document', documentId] as const,
  documentSegments: (datasetId: string, documentId: string) => 
    ['dify', 'dataset', datasetId, 'document', documentId, 'segments'] as const,
  segmentDetails: (datasetId: string, documentId: string, segmentId: string) => 
    ['dify', 'dataset', datasetId, 'document', documentId, 'segment', segmentId] as const,
  searchSegments: (datasetId: string, documentId: string, keyword: string) => 
    ['dify', 'dataset', datasetId, 'document', documentId, 'segments', 'search', keyword] as const,
} as const;

// API实例Hook
export function useExtendedDifyDatasetAPI() {
  const { config } = useDifyConfig();
  return new ExtendedDifyDatasetAPI(config);
}

/**
 * 获取文档详情
 */
export function useDocumentDetails(
  datasetId: string | undefined, 
  documentId: string | undefined, 
  enabled = true
) {
  const api = useExtendedDifyDatasetAPI();

  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.documentDetails(datasetId || '', documentId || ''),
    queryFn: () => api.getDocumentDetails(datasetId!, documentId!),
    enabled: enabled && !!datasetId && !!documentId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000, // 10分钟垃圾回收
    retry: (failureCount, error) => {
      // 404错误不重试
      if (error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
    refetchInterval: (query) => {
      // 对于处理中的文档，启用轮询
      const document = query.state.data as ExtendedDocumentDetails | undefined;
      if (document?.indexing_status && 
          ['waiting', 'queuing', 'indexing', 'splitting', 'processing'].includes(document.indexing_status)) {
        return 3000; // 3秒轮询
      }
      return false;
    },
  });
}

/**
 * 获取文档分段信息（无限查询）
 */
export function useDocumentSegments(
  datasetId: string | undefined, 
  documentId: string | undefined, 
  enabled = true
) {
  const api = useExtendedDifyDatasetAPI();

  return useInfiniteQuery({
    queryKey: DOCUMENT_QUERY_KEYS.documentSegments(datasetId || '', documentId || ''),
    queryFn: ({ pageParam = 1 }) => 
      api.getDocumentSegments(datasetId!, documentId!, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.data.length < 20 || !lastPage.has_more) {
        return undefined;
      }
      return (lastPageParam as number) + 1;
    },
    enabled: enabled && !!datasetId && !!documentId,
    staleTime: 10 * 60 * 1000, // 10分钟缓存
    gcTime: 15 * 60 * 1000, // 15分钟垃圾回收
    refetchInterval: (query) => {
      // 检查是否有处理中的分段
      const pages = query.state.data?.pages || [];
      const allSegments = pages.flatMap(page => page.data);
      const hasProcessingSegments = allSegments.some((segment: DocumentSegment) => 
        ['waiting', 'indexing'].includes(segment.status)
      );
      
      if (hasProcessingSegments) {
        return 5000; // 5秒轮询
      }
      return false;
    },
  });
}

/**
 * 搜索文档分段
 */
export function useSearchDocumentSegments(
  datasetId: string | undefined,
  documentId: string | undefined,
  keyword: string,
  enabled = true
) {
  const api = useExtendedDifyDatasetAPI();

  return useInfiniteQuery({
    queryKey: DOCUMENT_QUERY_KEYS.searchSegments(datasetId || '', documentId || '', keyword),
    queryFn: ({ pageParam = 1 }) => 
      api.searchDocumentSegments(datasetId!, documentId!, keyword, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.data.length < 20 || !lastPage.has_more) {
        return undefined;
      }
      return (lastPageParam as number) + 1;
    },
    enabled: enabled && !!datasetId && !!documentId && keyword.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 搜索结果缓存2分钟
  });
}

/**
 * 获取单个分段详情
 */
export function useSegmentDetails(
  datasetId: string | undefined,
  documentId: string | undefined,
  segmentId: string | undefined,
  enabled = true
) {
  const api = useExtendedDifyDatasetAPI();

  return useQuery({
    queryKey: DOCUMENT_QUERY_KEYS.segmentDetails(datasetId || '', documentId || '', segmentId || ''),
    queryFn: () => api.getSegmentDetails(datasetId!, documentId!, segmentId!),
    enabled: enabled && !!datasetId && !!documentId && !!segmentId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 批量更新分段状态
 */
export function useUpdateSegmentsStatus() {
  const api = useExtendedDifyDatasetAPI();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      datasetId, 
      documentId, 
      segmentIds, 
      enabled 
    }: { 
      datasetId: string; 
      documentId: string; 
      segmentIds: string[]; 
      enabled: boolean; 
    }) => api.updateSegmentsStatus(datasetId, documentId, segmentIds, enabled),
    
    onMutate: async ({ datasetId, documentId, segmentIds, enabled }) => {
      // 乐观更新：立即更新UI中的分段状态
      const queryKey = DOCUMENT_QUERY_KEYS.documentSegments(datasetId, documentId);
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData(queryKey);
      
      // 更新缓存中的分段状态
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        
        const newPages = oldData.pages.map((page: DocumentSegmentListResponse) => ({
          ...page,
          data: page.data.map((segment: DocumentSegment) => 
            segmentIds.includes(segment.id)
              ? { ...segment, enabled, disabled_at: enabled ? null : Date.now() / 1000 }
              : segment
          )
        }));
        
        return {
          ...oldData,
          pages: newPages
        };
      });
      
      return { previousData };
    },
    
    onSuccess: (data, variables) => {
      const { updated_count } = data;
      const action = variables.enabled ? '启用' : '禁用';
      toast.success(`成功${action} ${updated_count} 个分段`);
    },
    
    onError: (error: Error, variables, context) => {
      console.error('批量更新分段状态失败:', error);
      toast.error(`批量操作失败: ${error.message}`);
      
      // 回滚乐观更新
      if (context?.previousData) {
        queryClient.setQueryData(
          DOCUMENT_QUERY_KEYS.documentSegments(variables.datasetId, variables.documentId),
          context.previousData
        );
      }
    },
    
    onSettled: (data, error, variables) => {
      // 刷新分段数据以确保数据一致性
      queryClient.invalidateQueries({
        queryKey: DOCUMENT_QUERY_KEYS.documentSegments(variables.datasetId, variables.documentId)
      });
    },
  });
}

/**
 * 预加载文档详情（用于hover预加载）
 */
export function usePrefetchDocumentDetails() {
  const queryClient = useQueryClient();
  const api = useExtendedDifyDatasetAPI();

  return (datasetId: string, documentId: string) => {
    queryClient.prefetchQuery({
      queryKey: DOCUMENT_QUERY_KEYS.documentDetails(datasetId, documentId),
      queryFn: () => api.getDocumentDetails(datasetId, documentId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * 刷新文档相关的所有数据
 */
export function useRefreshDocumentData() {
  const queryClient = useQueryClient();

  return (datasetId: string, documentId: string) => {
    // 刷新文档详情
    queryClient.invalidateQueries({
      queryKey: DOCUMENT_QUERY_KEYS.documentDetails(datasetId, documentId)
    });
    
    // 刷新分段数据
    queryClient.invalidateQueries({
      queryKey: DOCUMENT_QUERY_KEYS.documentSegments(datasetId, documentId)
    });
    
    // 清除搜索缓存
    queryClient.removeQueries({
      queryKey: ['dify', 'dataset', datasetId, 'document', documentId, 'segments', 'search'],
      type: 'all'
    });
  };
}