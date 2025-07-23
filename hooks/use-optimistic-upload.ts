/**
 * 乐观文件上传的React Hook
 * 提供文件上传的乐观更新功能，与现有的React Query系统协调工作
 */

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  optimisticUploadManager, 
  OptimisticFile, 
  UploadProgress,
  FileUploadStatus 
} from '@/lib/optimistic-upload';
import { useDifyDatasetAPI } from './use-dify-dataset';
import { useDifyConfig } from '@/contexts/dify-config-context';

// 查询键
const QUERY_KEYS = {
  datasetDocuments: (datasetId: string) => ['dify', 'dataset', datasetId, 'documents'] as const,
  datasetDetails: (datasetId: string) => ['dify', 'dataset', datasetId] as const,
};

export function useOptimisticFileUpload(datasetId: string) {
  const [files, setFiles] = useState<OptimisticFile[]>([]);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    duplicates: 0,
    inProgress: 0,
  });
  
  const queryClient = useQueryClient();
  const difyApi = useDifyDatasetAPI();
  const { config } = useDifyConfig();

  // 设置Dify配置到乐观更新管理器
  useEffect(() => {
    if (config) {
      optimisticUploadManager.setDifyConfig(config);
    }
  }, [config]);

  // 订阅文件状态变化
  useEffect(() => {
    const unsubscribeFiles = optimisticUploadManager.onFilesChange(setFiles);
    const unsubscribeProgress = optimisticUploadManager.onProgressChange(setProgress);
    
    // 初始化当前状态
    setFiles(optimisticUploadManager.getFiles());
    setProgress(optimisticUploadManager.getProgress());
    
    return () => {
      unsubscribeFiles();
      unsubscribeProgress();
    };
  }, []);

  // 监听文件状态变化，更新React Query缓存
  useEffect(() => {
    const completedFiles = files.filter(f => f.status === 'completed');
    const duplicateFiles = files.filter(f => f.status === 'duplicate');
    
    if (completedFiles.length > 0 || duplicateFiles.length > 0) {
      // 刷新文档列表和知识库详情
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDocuments(datasetId)
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetDetails(datasetId)
      });
    }
  }, [files, datasetId, queryClient]);

  // 添加文件（乐观更新的入口点）
  const addFiles = useCallback((fileList: FileList) => {
    if (!fileList || fileList.length === 0) return [];

    // 文件验证
    const validFiles: File[] = [];
    const invalidFiles: { file: File; reason: string }[] = [];

    Array.from(fileList).forEach(file => {
      // 文件大小检查（50MB限制）
      if (file.size > 50 * 1024 * 1024) {
        invalidFiles.push({ file, reason: '文件大小超过50MB限制' });
        return;
      }

      // 文件类型检查
      const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        invalidFiles.push({ file, reason: '不支持的文件类型' });
        return;
      }

      validFiles.push(file);
    });

    // 显示无效文件的错误信息
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, reason }) => {
        toast.error(`文件 "${file.name}" 上传失败`, {
          description: reason,
          duration: 4000,
        });
      });
    }

    // 添加有效文件到乐观更新管理器
    if (validFiles.length > 0) {
      const fileListObj = Object.assign(validFiles, {
        length: validFiles.length,
        item: (index: number) => validFiles[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < validFiles.length; i++) {
            yield validFiles[i];
          }
        }
      }) as FileList;

      const localIds = optimisticUploadManager.addFiles(fileListObj, datasetId);
      
      // 显示添加成功的提示
      if (validFiles.length === 1) {
        toast.info(`开始上传文件 "${validFiles[0].name}"`, {
          description: '文件已添加到上传队列',
          duration: 3000,
        });
      } else {
        toast.info(`开始上传 ${validFiles.length} 个文件`, {
          description: '文件已添加到上传队列',
          duration: 3000,
        });
      }

      return localIds;
    }

    return [];
  }, [datasetId]);

  // 重试上传
  const retryUpload = useCallback((localId: string) => {
    optimisticUploadManager.retryUpload(localId, datasetId);
    toast.info('正在重试上传文件...', { duration: 2000 });
  }, [datasetId]);

  // 取消上传
  const cancelUpload = useCallback((localId: string) => {
    optimisticUploadManager.cancelUpload(localId);
    toast.info('已取消文件上传', { duration: 2000 });
  }, []);

  // 移除文件
  const removeFile = useCallback((localId: string) => {
    optimisticUploadManager.removeFile(localId);
  }, []);

  // 清理已完成的文件
  const clearCompleted = useCallback(() => {
    optimisticUploadManager.clearCompleted();
    toast.success('已清理完成的文件', { duration: 2000 });
  }, []);

  // 批量操作
  const retryAllFailed = useCallback(() => {
    const failedFiles = files.filter(f => f.status === 'failed');
    failedFiles.forEach(file => {
      optimisticUploadManager.retryUpload(file.localId, datasetId);
    });
    
    if (failedFiles.length > 0) {
      toast.info(`正在重试 ${failedFiles.length} 个失败的文件...`, { duration: 3000 });
    }
  }, [files, datasetId]);

  const cancelAllPending = useCallback(() => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    pendingFiles.forEach(file => {
      optimisticUploadManager.cancelUpload(file.localId);
    });
    
    if (pendingFiles.length > 0) {
      toast.info(`已取消 ${pendingFiles.length} 个等待中的文件`, { duration: 3000 });
    }
  }, [files]);

  // 获取不同状态的文件
  const getFilesByStatus = useCallback((status: FileUploadStatus) => {
    return files.filter(f => f.status === status);
  }, [files]);

  // 检查是否有正在进行的上传
  const hasActiveUploads = progress.inProgress > 0;

  // 检查是否有失败的上传
  const hasFailedUploads = progress.failed > 0;

  return {
    // 状态数据
    files,
    progress,
    hasActiveUploads,
    hasFailedUploads,
    
    // 操作方法
    addFiles,
    retryUpload,
    cancelUpload,
    removeFile,
    clearCompleted,
    
    // 批量操作
    retryAllFailed,
    cancelAllPending,
    
    // 查询方法
    getFilesByStatus,
    
    // 便捷访问器
    pendingFiles: getFilesByStatus('pending'),
    uploadingFiles: getFilesByStatus('uploading'),
    processingFiles: getFilesByStatus('processing'),
    completedFiles: getFilesByStatus('completed'),
    failedFiles: getFilesByStatus('failed'),
    duplicateFiles: getFilesByStatus('duplicate'),
  };
}

// 文件上传状态的显示文本和样式
export const FILE_STATUS_CONFIG = {
  pending: {
    text: '等待上传',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
    icon: '⏳',
  },
  uploading: {
    text: '上传中',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: '📤',
  },
  processing: {
    text: '处理中',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: '⚙️',
  },
  completed: {
    text: '完成',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: '✅',
  },
  failed: {
    text: '失败',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: '❌',
  },
  duplicate: {
    text: '重复',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: '🔄',
  },
  cancelled: {
    text: '已取消',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: '🚫',
  },
} as const;