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

/**
 * 上传文件到服务器
 * @param file 要上传的文件
 * @param onProgress 进度回调函数
 * @returns 上传的文件信息
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<FileUploadResponse>('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error('文件上传错误:', error);
    throw new Error('文件上传失败');
  }
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