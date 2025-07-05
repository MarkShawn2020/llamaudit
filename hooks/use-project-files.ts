import { useQuery } from '@tanstack/react-query';
import { UIFile } from '@/components/projects/utils/ui-file';

// Query keys
export const projectFileKeys = {
  all: ['project-files'] as const,
  lists: () => [...projectFileKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectFileKeys.lists(), projectId] as const,
};

// Get project files with full initialization
export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: projectFileKeys.list(projectId),
    queryFn: async (): Promise<UIFile[]> => {
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (!response.ok) {
        throw new Error('Failed to fetch project files');
      }
      
      const filesData = await response.json();
      
      if (!Array.isArray(filesData)) {
        return [];
      }

      // Convert to UIFile format with proper initialization
      return filesData.map((file: any) => {
        // 安全地解析metadata
        let parsedMetadata = {};
        if (file.metadata) {
          try {
            let metadataStr = file.metadata.trim();
            if (metadataStr.startsWith('```json')) {
              metadataStr = metadataStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            }
            parsedMetadata = JSON.parse(metadataStr);
          } catch (parseError) {
            console.warn('metadata解析失败', { fileId: file.id, parseError });
            parsedMetadata = {};
          }
        }

        return {
          ...file,
          status: file.isAnalyzed ? 'analyzed' : 'uploaded',
          analysisResult: typeof parsedMetadata === 'object' ? JSON.stringify(parsedMetadata, null, 2) : (file.analysisResult || ''),
          syncToKnowledgeBase: file.knowledgeBaseId ? true : false, // 根据是否有知识库ID来判断同步状态
          syncLoading: false,
          progress: 100, // 已上传完成
          error: undefined
        };
      });
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get project file statistics
export function useProjectFileStats(projectId: string) {
  const { data: files = [] } = useProjectFiles(projectId);
  
  return {
    documentCount: files.length,
    analyzedCount: files.filter(f => f.status === 'analyzed').length,
    syncedCount: files.filter(f => f.syncToKnowledgeBase).length,
  };
}