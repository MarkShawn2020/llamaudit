'use server';

import { DifyDatasetAPI } from '@/lib/api/dify-dataset-api';
import type { DifyConfig } from '@/types/dify-config';
import type { 
  DifyDataset, 
  DifyDocument, 
  CreateDatasetPayload, 
  DocumentListResponse,
  CreateDocumentResponse 
} from '@/lib/api/dify-dataset-api';

/**
 * 清理文件名中的特殊字符，确保与Dify API兼容
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    // 替换中文引号
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // 替换其他可能有问题的字符
    .replace(/[<>:"/\\|?*]/g, '_')
    // 替换连续的空格和下划线
    .replace(/\s+/g, ' ')
    .replace(/_+/g, '_')
    // 去除首尾空格
    .trim();
}



/**
 * 获取数据集详情
 */
export async function getDatasetDetails(config: DifyConfig, datasetId: string): Promise<DifyDataset> {
  try {
    console.log('📋 getDatasetDetails 接收到的配置:', {
      baseUrl: config?.baseUrl,
      environment: config?.environment,
      hasApiKey: !!config?.apiKey,
      hasDatasetApiKey: !!config?.datasetApiKey,
      datasetApiKeyType: typeof config?.datasetApiKey,
      configKeys: Object.keys(config || {}),
    });
    
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
export async function createDataset(config: DifyConfig, payload: CreateDatasetPayload): Promise<DifyDataset> {
  try {
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
  config: DifyConfig,
  datasetId: string, 
  page: number = 1, 
  limit: number = 20
): Promise<DocumentListResponse> {
  try {
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
  config: DifyConfig,
  datasetId: string,
  fileBuffer: ArrayBuffer,
  fileName: string,
  options: {
    indexing_technique?: 'high_quality' | 'economy';
    process_mode?: 'automatic' | 'custom';
  } = {}
): Promise<CreateDocumentResponse> {
  // 清理文件名以确保与Dify API兼容
  const sanitizedFileName = sanitizeFileName(fileName);
  
  try {
    const api = new DifyDatasetAPI(config);
    
    // 创建File对象（Node.js 20+支持）
    const file = new File([fileBuffer], sanitizedFileName, {
      type: getContentType(fileName)
    });
    
    return await api.createDocumentByFile(datasetId, file, options);
  } catch (error) {
    // 增强错误日志，提供文件上传的上下文信息
    const fileInfo = {
      originalFileName: fileName,
      sanitizedFileName: sanitizedFileName,
      fileSize: fileBuffer.byteLength,
      mimeType: getContentType(fileName),
      datasetId: datasetId,
      uploadOptions: options
    };
    
    console.error('📤 文件上传失败 - 文件信息:', fileInfo);
    console.error('❌ 原始错误:', error);
    
    throw error;
  }
}

/**
 * 删除文档
 */
export async function deleteDocument(config: DifyConfig, datasetId: string, documentId: string): Promise<void> {
  try {
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
export async function deleteDataset(config: DifyConfig, datasetId: string): Promise<void> {
  try {
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
  config: DifyConfig,
  datasetId: string, 
  batch: string
): Promise<any> {
  try {
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
  config: DifyConfig,
  datasetIds: string[],
  page: number = 1,
  limit: number = 20
): Promise<Record<string, DocumentListResponse>> {
  try {
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
export async function getDocumentDetails(config: DifyConfig, datasetId: string, documentId: string): Promise<any> {
  try {
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
  config: DifyConfig,
  datasetId: string, 
  documentId: string, 
  page: number = 1, 
  limit: number = 20
): Promise<any> {
  try {
    
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
  config: DifyConfig,
  datasetId: string,
  documentId: string,
  keyword: string,
  page: number = 1,
  limit: number = 20
): Promise<any> {
  try {
    
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
  config: DifyConfig,
  datasetId: string,
  documentId: string,
  segmentId: string
): Promise<any> {
  try {
    
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
  config: DifyConfig,
  datasetId: string,
  documentId: string,
  segmentIds: string[],
  enabled: boolean
): Promise<{ success: boolean; updated_count: number }> {
  try {
    
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
  config: DifyConfig,
  datasetId: string,
  documentId: string
): Promise<any> {
  try {
    
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
 * 知识库检索
 */
export async function retrieveKnowledge(
  config: DifyConfig,
  datasetId: string,
  query: string,
  retrievalModel: {
    search_method?: 'keyword_search' | 'semantic_search' | 'full_text_search' | 'hybrid_search';
    reranking_enable?: boolean;
    top_k?: number;
    score_threshold_enabled?: boolean;
    score_threshold?: number;
    weights?: number;
  } = {}
): Promise<any> {
  try {
    
    const requestBody = {
      query,
      retrieval_model: {
        search_method: retrievalModel.search_method || 'hybrid_search',
        reranking_enable: retrievalModel.reranking_enable ?? true,
        top_k: retrievalModel.top_k || 5,
        score_threshold_enabled: retrievalModel.score_threshold_enabled ?? true,
        score_threshold: retrievalModel.score_threshold || 0.3,
        weights: retrievalModel.weights || (retrievalModel.search_method === 'hybrid_search' ? 0.7 : undefined),
      }
    };

    const response = await fetch(`${config.baseUrl}/datasets/${datasetId}/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.datasetApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('知识库检索失败:', error);
    throw error;
  }
}

/**
 * 健康检查：测试Dify连接
 */
export async function testDifyConnection(config: DifyConfig): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🧪 测试Dify连接，配置信息:', {
      baseUrl: config.baseUrl,
      environment: config.environment,
      hasDatasetApiKey: !!config.datasetApiKey,
      datasetApiKeyPreview: config.datasetApiKey ? `${config.datasetApiKey.substring(0, 12)}...${config.datasetApiKey.substring(config.datasetApiKey.length - 4)}` : 'undefined'
    });
    
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