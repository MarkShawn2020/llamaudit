import { toast } from 'sonner';
import { 
  getProjectFiles as getFilesAction, 
  uploadProjectFiles, 
  deleteProjectFile as deleteFileAction,
  updateFileAnalysisStatus as updateFileStatusAction,
  FileResponse
} from '@/lib/actions/file-actions';

export interface ProjectFile {
  id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  uploadedBy?: string;
  category?: 'meeting' | 'contract' | 'attachment';
  isAnalyzed?: boolean;
}

/**
 * 获取项目文件列表
 * @param projectId 项目ID
 */
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    // 调用server action获取文件列表
    const files = await getFilesAction(projectId);
    
    // 为每个文件设置category属性
    return files.map((file: FileResponse) => ({
      ...file,
      category: determineFileCategory(file.filename)
    }));
  } catch (error) {
    console.error(`获取项目[${projectId}]文件列表失败:`, error);
    toast.error('获取文件列表失败');
    throw error;
  }
}

/**
 * 上传项目文件
 * @param projectId 项目ID
 * @param files 文件数组
 * @param onProgress 上传进度回调（可选）
 */
export async function uploadProjectFile(
  projectId: string, 
  files: File[], 
  onProgress?: (progress: number) => void
): Promise<{files: ProjectFile[]}> {
  try {
    // 检查文件大小
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB，与next.config.ts中的设置保持一致
    const oversizedFiles = files.filter(file => file.size > maxSizeInBytes);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(2)}MB)`).join(', ');
      const errorMessage = `文件大小超过限制(10MB): ${fileNames}`;
      
      // 显示错误提示
      toast.error(errorMessage);
      
      if (onProgress) {
        onProgress(0); // 重置进度
      }
      
      throw new Error(errorMessage);
    }
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('projectId', projectId);
    
    // 添加所有选定文件到FormData
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    // 显示进度 (简化处理)
    if (onProgress) {
      onProgress(10); // 开始上传
    }

    try {
      // 调用server action上传文件
      const result = await uploadProjectFiles(formData);
      
      if (onProgress) {
        onProgress(100); // 上传完成
      }
      
      // 为每个文件添加类别信息
      if (result.files) {
        result.files = result.files.map((file: FileResponse) => ({
          ...file,
          category: determineFileCategory(file.filename)
        }));
      }
      
      return result;
    } catch (uploadError) {
      if (onProgress) {
        onProgress(0); // 重置进度
      }
      
      // 检查错误类型和消息
      let errorMessage = '文件上传失败';
      
      if (uploadError instanceof Error) {
        // 检查是否包含特定错误信息
        if (uploadError.message.includes('body size limit')) {
          errorMessage = `文件总大小超过限制(10MB)`;
        } else {
          errorMessage = uploadError.message;
        }
      }
      
      toast.error(errorMessage);
      throw uploadError;
    }
  } catch (error) {
    console.error(`上传项目[${projectId}]文件失败:`, error);
    
    // 避免重复显示错误消息
    if (!(error instanceof Error && error.message.includes('文件大小超过限制'))) {
      toast.error('文件上传失败');
    }
    
    throw error;
  }
}

/**
 * 删除项目文件
 * @param projectId 项目ID
 * @param fileId 文件ID
 */
export async function deleteProjectFile(projectId: string, fileId: string): Promise<boolean> {
  try {
    // 调用server action删除文件
    const result = await deleteFileAction(projectId, fileId);
    return result.success;
  } catch (error) {
    console.error(`删除项目[${projectId}]文件[${fileId}]失败:`, error);
    toast.error('删除文件失败');
    throw error;
  }
}

/**
 * 更新文件分析状态
 * @param projectId 项目ID
 * @param fileId 文件ID
 * @param isAnalyzed 是否已分析
 */
export async function updateFileAnalysisStatus(
  projectId: string, 
  fileId: string, 
  isAnalyzed: boolean
): Promise<ProjectFile> {
  try {
    // 调用server action更新文件分析状态
    const updatedFile = await updateFileStatusAction(projectId, fileId, isAnalyzed);
    
    // 添加category字段
    return {
      ...updatedFile,
      category: determineFileCategory(updatedFile.filename)
    };
  } catch (error) {
    console.error(`更新项目[${projectId}]文件[${fileId}]分析状态失败:`, error);
    toast.error('更新文件状态失败');
    throw error;
  }
}

/**
 * 根据文件名确定文件类别
 * @param fileName 文件名
 */
export function determineFileCategory(fileName: string): 'meeting' | 'contract' | 'attachment' {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('会议') || lowerName.includes('纪要')) {
    return 'meeting';
  } else if (lowerName.includes('合同') || lowerName.includes('协议')) {
    return 'contract';
  }
  return 'attachment';
} 