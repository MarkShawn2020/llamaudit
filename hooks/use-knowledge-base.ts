import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  getKnowledgeBasesByAuditUnit,
  getKnowledgeBaseStats,
  getDifyDocuments,
  createKnowledgeBase,
  deleteKnowledgeBase,
} from '@/lib/actions/knowledge-base-actions';
import { KnowledgeBase } from '@/lib/db/schema';

// Query keys
export const knowledgeBaseKeys = {
  all: ['knowledge-bases'] as const,
  lists: () => [...knowledgeBaseKeys.all, 'list'] as const,
  list: (auditUnitId: string) => [...knowledgeBaseKeys.lists(), auditUnitId] as const,
  stats: (auditUnitId: string) => [...knowledgeBaseKeys.all, 'stats', auditUnitId] as const,
  documents: (auditUnitId: string, datasetId?: string) => [...knowledgeBaseKeys.all, 'documents', auditUnitId, datasetId] as const,
};

// Get knowledge bases by audit unit
export function useKnowledgeBases(auditUnitId: string) {
  return useQuery({
    queryKey: knowledgeBaseKeys.list(auditUnitId),
    queryFn: async () => {
      const result = await getKnowledgeBasesByAuditUnit(auditUnitId);
      if (!result.success) {
        throw new Error(result.error || '加载知识库列表失败');
      }
      return result.data || [];
    },
    enabled: !!auditUnitId,
  });
}

// Get knowledge base stats
export function useKnowledgeBaseStats(auditUnitId: string, knowledgeBases: KnowledgeBase[]) {
  return useQuery({
    queryKey: knowledgeBaseKeys.stats(auditUnitId),
    queryFn: async () => {
      const statsPromises = knowledgeBases.map(async (kb) => {
        try {
          const result = await getKnowledgeBaseStats(kb.difyDatasetId);
          return {
            id: kb.difyDatasetId,
            stats: result.success ? result.data : { documentCount: 0, wordCount: 0, appCount: 0 }
          };
        } catch (error) {
          console.error(`Error loading stats for knowledge base ${kb.id}:`, error);
          return {
            id: kb.difyDatasetId,
            stats: { documentCount: 0, wordCount: 0, appCount: 0 }
          };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      return statsResults.reduce((acc, { id, stats }) => {
        acc[id] = stats;
        return acc;
      }, {} as Record<string, { documentCount: number; wordCount: number; appCount: number }>);
    },
    enabled: knowledgeBases.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get knowledge base documents
export function useKnowledgeBaseDocuments(auditUnitId: string, difyDatasetId?: string) {
  return useQuery({
    queryKey: knowledgeBaseKeys.documents(auditUnitId, difyDatasetId),
    queryFn: async () => {
      if (!difyDatasetId) return [];
      
      const result = await getDifyDocuments(difyDatasetId, 1, 50);
      if (!result.success) {
        throw new Error(result.error || '加载文档列表失败');
      }
      return result.documents || [];
    },
    enabled: !!difyDatasetId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Create knowledge base mutation
export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ auditUnitId, formData }: { auditUnitId: string; formData: FormData }) => {
      const result = await createKnowledgeBase({}, formData);
      if (!result.success) {
        throw new Error(result.error || '创建知识库失败');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success('知识库创建成功');
      // Invalidate and refetch knowledge bases list
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(variables.auditUnitId) });
    },
    onError: (error) => {
      toast.error(error.message || '创建知识库失败');
    },
  });
}

// Delete knowledge base mutation
export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, auditUnitId }: { id: string; auditUnitId: string }) => {
      const result = await deleteKnowledgeBase(id);
      if (!result.success) {
        throw new Error(result.error || '删除知识库失败');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success('知识库删除成功');
      // Invalidate and refetch knowledge bases list
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(variables.auditUnitId) });
    },
    onError: (error) => {
      toast.error(error.message || '删除知识库失败');
    },
  });
}

// Utility hook to invalidate knowledge base data when files are synced
export function useInvalidateKnowledgeBase() {
  const queryClient = useQueryClient();
  
  const invalidateStats = useCallback((auditUnitId: string) => {
    queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.stats(auditUnitId) });
  }, [queryClient]);
  
  const invalidateDocuments = useCallback((auditUnitId: string, difyDatasetId?: string) => {
    queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.documents(auditUnitId, difyDatasetId) });
  }, [queryClient]);
  
  const invalidateAll = useCallback((auditUnitId: string) => {
    queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.list(auditUnitId) });
    queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.stats(auditUnitId) });
    queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.documents(auditUnitId) });
  }, [queryClient]);
  
  return {
    invalidateStats,
    invalidateDocuments,
    invalidateAll,
  };
}