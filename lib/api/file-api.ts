import axios from 'axios';

export interface FileUploadResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  id: string;
  url: string;
}

/**
 * 上传文件API接口
 * 
 * @param file 要上传的文件
 * @param onProgress 上传进度回调
 * @returns 上传完成后的文件信息
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ id: string; url: string }> {
  return new Promise((resolve, reject) => {
    // 模拟文件上传过程
    let progress = 0;
    const totalSize = file.size;
    const chunkSize = totalSize / 10; // 分10次上传
    const interval = setInterval(() => {
      progress += chunkSize;
      
      // 调用进度回调
      if (onProgress) {
        onProgress(Math.min(Math.floor((progress / totalSize) * 100), 99));
      }
      
      // 上传完成
      if (progress >= totalSize) {
        clearInterval(interval);
        
        // 模拟服务器处理时间
        setTimeout(() => {
          if (onProgress) {
            onProgress(100);
          }
          
          // 生成唯一ID
          const id = Math.random().toString(36).substring(2, 12);
          
          // 返回上传结果
          resolve({
            id,
            url: `https://api.example.com/files/${id}/${encodeURIComponent(file.name)}`,
          });
        }, 500);
      }
    }, 300);
  });
}

/**
 * 获取文件信息
 * @param fileId 文件ID
 * @returns 文件元数据
 */
export async function getFile(fileId: string): Promise<FileMetadata> {
  try {
    const response = await axios.get<FileMetadata>(`/api/files/${fileId}`);
    return response.data;
  } catch (error) {
    console.error('获取文件信息错误:', error);
    throw new Error('获取文件信息失败');
  }
}

/**
 * 删除文件
 * @param fileId 文件ID
 * @returns 是否删除成功
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await axios.delete(`/api/files/${fileId}`);
    return true;
  } catch (error) {
    console.error('删除文件错误:', error);
    throw new Error('删除文件失败');
  }
}

/**
 * 获取文件列表
 * @param queryParams 查询参数
 * @returns 文件元数据列表
 */
export async function getFiles(queryParams?: {
  limit?: number;
  offset?: number;
  type?: string;
}): Promise<FileMetadata[]> {
  try {
    const response = await axios.get<FileMetadata[]>('/api/files', {
      params: queryParams,
    });
    return response.data;
  } catch (error) {
    console.error('获取文件列表错误:', error);
    throw new Error('获取文件列表失败');
  }
} 