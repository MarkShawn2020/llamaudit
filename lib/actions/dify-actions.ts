'use server';

import { DifyDatasetAPI } from '@/lib/api/dify-dataset-api';
import { DEFAULT_DIFY_CONFIGS } from '@/types/dify-config';
import type { 
  DifyDataset, 
  DifyDocument, 
  CreateDatasetPayload, 
  DocumentListResponse,
  CreateDocumentResponse 
} from '@/lib/api/dify-dataset-api';

/**
 * 获取Dify配置的统一方法（服务器端）
 * 优先级: 环境变量 > 默认配置
 */
async function getDifyConfig() {
  const environment = (process.env.DIFY_ENVIRONMENT as 'local' | 'cloud') || 'cloud';
  const defaultConfig = DEFAULT_DIFY_CONFIGS[environment];
  
  return {
    ...defaultConfig,
    datasetApiKey: process.env.DIFY_DATASET_API_KEY || 
                   process.env.NEXT_PUBLIC_DIFY_DATASET_API_KEY || 
                   defaultConfig.datasetApiKey,
  };
}

/**
 * 获取数据集详情
 */
export async function getDatasetDetails(datasetId: string): Promise<DifyDataset> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    return await api.getDatasetDetails(datasetId);
  } catch (error) {
    console.error('获取数据集详情失败:', error);
    throw error;
  }
}

/**
 * 创建数据集
 */
export async function createDataset(payload: CreateDatasetPayload): Promise<DifyDataset> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    return await api.createDataset(payload);
  } catch (error) {
    console.error('创建数据集失败:', error);
    throw error;
  }
}

/**
 * 获取数据集文档列表
 */
export async function getDatasetDocuments(
  datasetId: string, 
  page: number = 1, 
  limit: number = 20
): Promise<DocumentListResponse> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    return await api.getDatasetDocuments(datasetId, page, limit);
  } catch (error) {
    console.error('获取数据集文档列表失败:', error);
    throw error;
  }
}

/**
 * 通过文件创建文档
 */
export async function createDocumentByFile(
  datasetId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: {
    indexing_technique?: 'high_quality' | 'economy';
    process_mode?: 'automatic' | 'custom';
  } = {}
): Promise<CreateDocumentResponse> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    
    // 在服务器端创建File对象
    const file = new File([fileBuffer], fileName, {
      type: getContentType(fileName)
    });
    
    return await api.createDocumentByFile(datasetId, file, options);
  } catch (error) {
    console.error('通过文件创建文档失败:', error);
    throw error;
  }
}

/**
 * 删除文档
 */
export async function deleteDocument(datasetId: string, documentId: string): Promise<void> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    await api.deleteDocument(datasetId, documentId);
  } catch (error) {
    console.error('删除文档失败:', error);
    throw error;
  }
}

/**
 * 删除数据集
 */
export async function deleteDataset(datasetId: string): Promise<void> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    await api.deleteDataset(datasetId);
  } catch (error) {
    console.error('删除数据集失败:', error);
    throw error;
  }
}

/**
 * 获取文档索引状态
 */
export async function getDocumentIndexingStatus(
  datasetId: string, 
  batch: string
): Promise<any> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    return await api.getDocumentIndexingStatus(datasetId, batch);
  } catch (error) {
    console.error('获取文档索引状态失败:', error);
    throw error;
  }
}

/**
 * 根据文件名获取Content-Type
 */
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'htm': 'text/html',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * 批量获取多个数据集的文档（用于优化性能）
 */
export async function batchGetDatasetDocuments(
  datasetIds: string[],
  page: number = 1,
  limit: number = 20
): Promise<Record<string, DocumentListResponse>> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    
    const results: Record<string, DocumentListResponse> = {};
    
    // 并发获取所有数据集的文档
    await Promise.allSettled(
      datasetIds.map(async (datasetId) => {
        try {
          const response = await api.getDatasetDocuments(datasetId, page, limit);
          results[datasetId] = response;
        } catch (error) {
          console.error(`获取数据集 ${datasetId} 的文档失败:`, error);
          // 继续处理其他数据集，不中断整个操作
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error('批量获取数据集文档失败:', error);
    throw error;
  }
}

/**
 * 获取文档详情
 */
export async function getDocumentDetails(datasetId: string, documentId: string): Promise<any> {
  try {
    const config = await getDifyConfig();
    const api = new DifyDatasetAPI(config);
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document details: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取文档详情失败:', error);
    throw error;
  }
}

/**
 * 获取文档分段信息
 */
export async function getDocumentSegments(
  datasetId: string, 
  documentId: string, 
  page: number = 1, 
  limit: number = 20
): Promise<any> {
  try {
    const config = await getDifyConfig();
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/segments?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document segments: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取文档分段失败:', error);
    throw error;
  }
}

/**
 * 搜索文档分段
 */
export async function searchDocumentSegments(
  datasetId: string,
  documentId: string,
  keyword: string,
  page: number = 1,
  limit: number = 20
): Promise<any> {
  try {
    const config = await getDifyConfig();
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/segments/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword,
        page,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search document segments: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('搜索文档分段失败:', error);
    throw error;
  }
}

/**
 * 获取分段详情
 */
export async function getSegmentDetails(
  datasetId: string,
  documentId: string,
  segmentId: string
): Promise<any> {
  try {
    const config = await getDifyConfig();
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch segment details: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取分段详情失败:', error);
    throw error;
  }
}

/**
 * 批量更新分段状态
 */
export async function updateSegmentsStatus(
  datasetId: string,
  documentId: string,
  segmentIds: string[],
  enabled: boolean
): Promise<{ success: boolean; updated_count: number }> {
  try {
    const config = await getDifyConfig();
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/segments/batch`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segment_ids: segmentIds,
        enabled,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update segments status: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('批量更新分段状态失败:', error);
    throw error;
  }
}

/**
 * 获取文档上传文件信息
 */
export async function getDocumentUploadFile(
  datasetId: string,
  documentId: string
): Promise<any> {
  try {
    const config = await getDifyConfig();
    
    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/documents/${documentId}/upload-file`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document upload file: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('获取文档上传文件失败:', error);
    throw error;
  }
}

/**
 * 健康检查：测试Dify连接
 */
export async function testDifyConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getDifyConfig();
    
    if (!config.datasetApiKey) {
      return {
        success: false,
        message: 'Dify API密钥未配置'
      };
    }
    
    const api = new DifyDatasetAPI(config);
    
    // 尝试进行一个简单的API调用来测试连接
    // 这里使用一个不存在的datasetId，预期会返回404，但说明连接正常
    try {
      await api.getDatasetDetails('test-connection-id');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 如果是404错误，说明连接正常，只是数据集不存在
      if (errorMessage.includes('404')) {
        return {
          success: true,
          message: 'Dify连接正常'
        };
      }
      
      // 如果是401或403，说明API密钥有问题
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          success: false,
          message: 'API密钥无效或权限不足'
        };
      }
      
      // 其他错误
      return {
        success: false,
        message: errorMessage
      };
    }
    
    return {
      success: true,
      message: 'Dify连接正常'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '连接测试失败'
    };
  }
}