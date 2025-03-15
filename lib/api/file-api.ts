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
 * 上传文件到阿里云 OSS
 * @param file 要上传的文件
 * @param onProgress 上传进度回调
 * @returns 上传结果，包含文件 ID 和访问 URL
 */
export async function uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResult> {
  try {
    // 1. 从服务器获取上传签名URL
    const formData = new FormData();
    formData.append('file', file, file.name);

    const { data } = await axios.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!data.success) {
      throw new Error(data.error || '获取上传URL失败');
    }

    const { uploadUrl, accessUrl, objectName } = data.data;

    // 2. 使用签名URL上传文件
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    // 3. 返回文件信息
    return {
      id: objectName,
      url: accessUrl,
    };
  } catch (error) {
    console.error('File upload error:', error);
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(
        error.response.data.error + 
        (error.response.data.details ? `: ${JSON.stringify(error.response.data.details)}` : '')
      );
    }
    throw new Error('文件上传失败，请重试');
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