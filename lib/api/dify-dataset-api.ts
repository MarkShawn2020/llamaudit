'use client';

import { DifyConfig } from '@/types/dify-config';

interface DifyDataset {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  permission: string;
  data_source_type: string | null;
  indexing_technique: string | null;
  app_count: number;
  document_count: number;
  word_count: number;
  created_by: string;
  created_at: number;
  updated_by: string;
  updated_at: number;
  embedding_model: string | null;
  embedding_model_provider: string | null;
  embedding_available: boolean | null;
}

interface DifyDocument {
  id: string;
  position: number;
  data_source_type: string;
  data_source_info: any;
  dataset_process_rule_id: string | null;
  name: string;
  created_from: string;
  created_by: string;
  created_at: number;
  tokens: number;
  indexing_status: string;
  error: string | null;
  enabled: boolean;
  disabled_at: number | null;
  disabled_by: string | null;
  archived: boolean;
  display_status: string;
  word_count: number;
  hit_count: number;
  doc_form: string;
}

interface CreateDatasetPayload {
  name: string;
  description?: string;
  indexing_technique?: 'high_quality' | 'economy';
  permission?: 'only_me' | 'all_team_members' | 'partial_members';
  provider?: 'vendor' | 'external';
}

interface CreateDocumentByFilePayload {
  data: {
    indexing_technique: 'high_quality' | 'economy';
    process_rule: {
      mode: 'automatic' | 'custom';
      rules?: any;
    };
  };
  file: File;
}

interface DatasetListResponse {
  data: DifyDataset[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

interface DocumentListResponse {
  data: DifyDocument[];
  has_more: boolean;
  limit: number;
  total: number;
  page: number;
}

interface CreateDocumentResponse {
  document: DifyDocument;
  batch: string;
}

class DifyDatasetAPI {
  private config: DifyConfig;

  constructor(config: DifyConfig) {
    this.config = config;
  }

  protected async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    useDatasetKey = true
  ): Promise<Response> {
    const apiKey = useDatasetKey ? this.config.datasetApiKey : this.config.apiKey;
    
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  async getDatasetDetails(datasetId: string): Promise<DifyDataset> {
    const response = await this.makeRequest(`/datasets/${datasetId}`);
    return response.json();
  }

  async createDataset(payload: CreateDatasetPayload): Promise<DifyDataset> {
    const response = await this.makeRequest('/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || '',
        indexing_technique: payload.indexing_technique || 'high_quality',
        permission: payload.permission || 'only_me',
        provider: payload.provider || 'vendor',
      }),
    });
    return response.json();
  }

  async getDatasetDocuments(datasetId: string, page = 1, limit = 20): Promise<DocumentListResponse> {
    const response = await this.makeRequest(
      `/datasets/${datasetId}/documents?page=${page}&limit=${limit}`
    );
    return response.json();
  }

  async createDocumentByFile(
    datasetId: string, 
    file: File,
    options: {
      indexing_technique?: 'high_quality' | 'economy';
      process_mode?: 'automatic' | 'custom';
    } = {}
  ): Promise<CreateDocumentResponse> {
    const formData = new FormData();
    
    const data = {
      indexing_technique: options.indexing_technique || 'high_quality',
      process_rule: {
        mode: options.process_mode || 'automatic',
      },
    };

    formData.append('data', JSON.stringify(data));
    formData.append('file', file);

    const response = await this.makeRequest(
      `/datasets/${datasetId}/document/create-by-file`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    const result = await response.json();
    
    // 详细日志记录，用于分析Dify的去重行为
    console.log('📄 Dify文档上传响应分析:', {
      fileName: file.name,
      fileSize: file.size,
      requestTime: new Date().toISOString(),
      response: {
        document: result.document,
        batch: result.batch,
        hasDocument: !!result.document,
        documentId: result.document?.id,
        documentName: result.document?.name,
        indexingStatus: result.document?.indexing_status,
        createdAt: result.document?.created_at,
        wordCount: result.document?.word_count,
      },
      analysis: {
        batchExists: !!result.batch,
        isCompleted: result.document?.indexing_status === 'completed',
        createdTimeAnalysis: result.document?.created_at ? {
          timestamp: result.document.created_at,
          readableTime: new Date(result.document.created_at * 1000).toISOString(),
          timeDiffFromNow: Date.now() - (result.document.created_at * 1000),
        } : null,
      }
    });
    
    return result;
  }

  async deleteDocument(datasetId: string, documentId: string): Promise<void> {
    await this.makeRequest(
      `/datasets/${datasetId}/documents/${documentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getDocumentIndexingStatus(datasetId: string, batch: string): Promise<any> {
    const response = await this.makeRequest(
      `/datasets/${datasetId}/documents/${batch}/indexing-status`
    );
    return response.json();
  }
}

export {
  DifyDatasetAPI,
  type DifyDataset,
  type DifyDocument,
  type CreateDatasetPayload,
  type CreateDocumentByFilePayload,
  type DatasetListResponse,
  type DocumentListResponse,
  type CreateDocumentResponse,
};