/**
 * 扩展的Dify数据集API - 添加文档详情和分段相关方法
 */

import { DifyDatasetAPI, DifyDocument } from './dify-dataset-api';

// 文档分段接口定义
export interface DocumentSegment {
  id: string;
  position: number;
  document_id: string;
  content: string;
  word_count: number;
  tokens: number;
  keywords: string[];
  index_node_id: string;
  index_node_hash: string;
  hit_count: number;
  enabled: boolean;
  disabled_at: number | null;
  disabled_by: string | null;
  status: 'waiting' | 'indexing' | 'completed' | 'error';
  created_by: string;
  created_at: number;
  indexing_at: number;
  completed_at: number;
  error: string | null;
  stopped_at: number | null;
}

// 分段列表响应接口
export interface DocumentSegmentListResponse {
  data: DocumentSegment[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

// 扩展的文档详情接口
export interface ExtendedDocumentDetails extends DifyDocument {
  // 增强的元数据
  file_size?: number;
  file_type?: string;
  upload_file?: {
    id: string;
    name: string;
    size: number;
    extension: string;
    mime_type: string;
  };
  
  // 处理时间信息
  processing_started_at?: number;
  processing_completed_at?: number;
  processing_duration?: number;
  
  // 内容统计
  character_count?: number;
  paragraph_count?: number;
  segment_count?: number;
  
  // 索引信息
  embedding_model?: string;
  embedding_dimensions?: number;
  vector_store_type?: string;
}

/**
 * 扩展的Dify数据集API类
 */
export class ExtendedDifyDatasetAPI extends DifyDatasetAPI {
  
  /**
   * 获取单个文档的详细信息
   */
  async getDocumentDetails(datasetId: string, documentId: string): Promise<ExtendedDocumentDetails> {
    try {
      const response = await this.makeRequest(
        `/datasets/${datasetId}/documents/${documentId}`,
        {
          method: 'GET',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching document details:', error);
      throw error;
    }
  }

  /**
   * 获取文档的分段信息（支持分页）
   */
  async getDocumentSegments(
    datasetId: string, 
    documentId: string, 
    page = 1, 
    limit = 20
  ): Promise<DocumentSegmentListResponse> {
    try {
      const response = await this.makeRequest(
        `/datasets/${datasetId}/documents/${documentId}/segments?page=${page}&limit=${limit}`,
        {
          method: 'GET',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document segments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching document segments:', error);
      throw error;
    }
  }

  /**
   * 搜索文档分段
   */
  async searchDocumentSegments(
    datasetId: string,
    documentId: string,
    keyword: string,
    page = 1,
    limit = 20
  ): Promise<DocumentSegmentListResponse> {
    try {
      const response = await this.makeRequest(
        `/datasets/${datasetId}/documents/${documentId}/segments/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword,
            page,
            limit,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search document segments: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching document segments:', error);
      throw error;
    }
  }

  /**
   * 获取单个分段的详细信息
   */
  async getSegmentDetails(
    datasetId: string,
    documentId: string,
    segmentId: string
  ): Promise<DocumentSegment> {
    try {
      const response = await this.makeRequest(
        `/datasets/${datasetId}/documents/${documentId}/segments/${segmentId}`,
        {
          method: 'GET',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch segment details: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching segment details:', error);
      throw error;
    }
  }

  /**
   * 批量操作分段（启用/禁用）
   */
  async updateSegmentsStatus(
    datasetId: string,
    documentId: string,
    segmentIds: string[],
    enabled: boolean
  ): Promise<{ success: boolean; updated_count: number }> {
    try {
      const response = await this.makeRequest(
        `/datasets/${datasetId}/documents/${documentId}/segments/batch`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            segment_ids: segmentIds,
            enabled,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to update segments status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating segments status:', error);
      throw error;
    }
  }
}