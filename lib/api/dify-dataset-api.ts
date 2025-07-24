import {DifyConfig} from '@/types/dify-config';

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
        
        // 添加配置验证和调试信息
        console.log('🔧 DifyDatasetAPI 初始化配置:', {
            baseUrl: config.baseUrl,
            environment: config.environment,
            hasApiKey: !!config.apiKey,
            hasDatasetApiKey: !!config.datasetApiKey,
            apiKeyPreview: config.apiKey ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}` : 'undefined',
            datasetApiKeyPreview: config.datasetApiKey ? `${config.datasetApiKey.substring(0, 8)}...${config.datasetApiKey.substring(config.datasetApiKey.length - 4)}` : 'undefined'
        });
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

    async deleteDataset(datasetId: string): Promise<void> {
        await this.makeRequest(
            `/datasets/${datasetId}`,
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

    protected async makeRequest(
        endpoint: string,
        options: RequestInit = {},
        useDatasetKey = true
    ): Promise<Response> {
        const apiKey = useDatasetKey ? this.config.datasetApiKey : this.config.apiKey;
        const fullUrl = `${this.config.baseUrl}${endpoint}`;

        // 验证API密钥
        if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
            throw new Error(`API密钥未配置或无效: ${useDatasetKey ? 'datasetApiKey' : 'apiKey'} = "${apiKey}"`);
        }

        // 构建最终的 headers
        const authHeader = `Bearer ${apiKey}`;
        const finalHeaders = {
            'Authorization': authHeader,
            ...options.headers,
        };

        console.log('🔍 API请求调试信息:', {
            endpoint: fullUrl,
            finalHeaders
        });

        const response = await fetch(fullUrl, {
            ...options,
            headers: finalHeaders,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({message: 'Unknown error'}));

            // 详细的错误调试信息
            const debugInfo = {
                endpoint: fullUrl,
                method: options.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                apiKeyType: useDatasetKey ? 'dataset' : 'app',
                apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'undefined',
                baseUrl: this.config.baseUrl,
                hasBody: !!options.body,
                bodyType: options.body ? (options.body instanceof FormData ? 'FormData' : typeof options.body) : 'none',
                timestamp: new Date().toISOString()
            };

            console.error('🚨 Dify API请求失败 - 调试信息:', debugInfo);
            console.error('📋 错误详情:', errorData);

            const enhancedMessage = `${errorData.message || `HTTP ${response.status}: ${response.statusText}`}\n` +
                `端点: ${fullUrl}\n` +
                `API密钥类型: ${debugInfo.apiKeyType} (${debugInfo.apiKeyPreview})\n` +
                `请求方法: ${debugInfo.method}`;

            throw new Error(enhancedMessage);
        }

        return response;
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