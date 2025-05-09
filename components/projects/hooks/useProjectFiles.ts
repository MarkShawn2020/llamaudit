import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  getProjectFiles,
  deleteProjectFile,
  ProjectFile,
  updateFileAnalysisStatus,
} from "@/lib/api/project-file-api";
import { logger } from "@/lib/logger";

export function useProjectFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 加载文件列表
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const projectFiles = await getProjectFiles(projectId);
      setFiles(projectFiles);
    } catch (error) {
      console.error("获取文件列表失败:", error);
      toast.error("获取文件列表失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 初始化加载
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 选择所有文件
  const handleSelectAll = useCallback(() => {
    setSelectedFiles((prev) => {
      const allIds = files.map((file) => file.id);
      // 如果当前所有文件都已选中，则清空所选；否则选择所有文件
      return prev.length === allIds.length ? [] : allIds;
    });
  }, [files]);

  // 选择单个文件
  const handleSelectFile = useCallback((fileId: string, checked: boolean) => {
    setSelectedFiles((prev) => {
      if (checked) {
        return [...prev, fileId];
      } else {
        return prev.filter((id) => id !== fileId);
      }
    });
  }, []);

  // 处理查看文件
  const handleViewFile = useCallback((file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  }, []);

  // 处理下载文件
  const handleDownloadFile = useCallback((file: ProjectFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  }, []);

  // 删除单个文件
  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      try {
        setDeleting(fileId);
        await deleteProjectFile(projectId, fileId);

        // 更新本地状态 - 移除已删除文件
        setFiles((prev) => prev.filter((file) => file.id !== fileId));

        // 如果删除的文件在选中列表中，也需要从选中列表中移除
        setSelectedFiles((prev) => prev.filter((id) => id !== fileId));

        toast.success("文件已删除");
      } catch (error) {
        console.error("删除文件失败:", error);
        toast.error("删除文件失败");
        logger.error("删除文件失败", { projectId, fileId, error });
      } finally {
        setDeleting(null);
      }
    },
    [projectId]
  );

  // 批量删除多个文件
  const handleBatchDeleteFiles = useCallback(
    async (fileIds: string[]) => {
      if (fileIds.length === 0) return;
      
      try {
        const totalCount = fileIds.length;
        let successCount = 0;
        let errorCount = 0;
        
        // 设置整批删除中的状态
        setDeleting('batch');
        
        // 使用Promise.all并行处理多个删除请求
        const deletePromises = fileIds.map(async (fileId) => {
          try {
            await deleteProjectFile(projectId, fileId);
            successCount++;
            return { success: true, fileId };
          } catch (error) {
            errorCount++;
            logger.error("批量删除文件失败", { projectId, fileId, error });
            return { success: false, fileId };
          }
        });
        
        const results = await Promise.all(deletePromises);
        
        // 更新本地状态 - 移除成功删除的文件
        const successfullyDeletedIds = results
          .filter(result => result.success)
          .map(result => result.fileId);
          
        if (successfullyDeletedIds.length > 0) {
          setFiles(prev => prev.filter(file => !successfullyDeletedIds.includes(file.id)));
          setSelectedFiles(prev => prev.filter(id => !successfullyDeletedIds.includes(id)));
        }
        
        // 显示结果通知
        if (successCount > 0 && errorCount === 0) {
          toast.success(`已成功删除 ${successCount} 个文件`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(`已删除 ${successCount} 个文件，${errorCount} 个文件删除失败`);
        } else {
          toast.error("删除文件失败");
        }
      } catch (error) {
        console.error("批量删除文件失败:", error);
        toast.error("批量删除文件失败");
        logger.error("批量删除文件操作失败", { projectId, fileIds, error });
      } finally {
        setDeleting(null);
      }
    },
    [projectId]
  );

  // 更新文件分析状态
  const updateFilesAnalysisStatus = useCallback(
    async (fileIds: string[]) => {
      // 批量更新本地文件状态
      setFiles((prev) =>
        prev.map((file) =>
          fileIds.includes(file.id) ? { ...file, isAnalyzed: true } : file
        )
      );

      // 更新服务器端状态
      for (const fileId of fileIds) {
        try {
          await updateFileAnalysisStatus(projectId, fileId, true);
        } catch (error) {
          console.error(`更新文件[${fileId}]分析状态失败:`, error);
        }
      }
    },
    [projectId]
  );

  // 添加新上传的文件
  const handleFilesUploaded = useCallback(
    (newFiles: ProjectFile[]) => {
      fetchFiles();
    },
    [fetchFiles]
  );

  // 清空已选文件
  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  return {
    files,
    selectedFiles,
    loading,
    deleting,
    fetchFiles,
    handleSelectAll,
    handleSelectFile,
    handleViewFile,
    handleDownloadFile,
    handleDeleteFile,
    handleBatchDeleteFiles,
    updateFilesAnalysisStatus,
    handleFilesUploaded,
    clearSelection,
  };
}
