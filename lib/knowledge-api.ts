/**
 * Dify 知识库检索 API 封装
 */

import { DifyRetrievalRequest, DifyRetrievalResponse, ApiResponse, AssistantError } from '@/components/knowledge-assistant/types';

export class KnowledgeAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 检索知识库
   */
  async retrieveKnowledge(
    datasetId: string, 
    request: DifyRetrievalRequest
  ): Promise<ApiResponse<DifyRetrievalResponse>> {
    try {
      const url = `${this.baseUrl}/v1/datasets/${datasetId}/retrieve`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `API request failed with status ${response.status}`
        );
      }

      const data: DifyRetrievalResponse = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Knowledge retrieval error:', error);
      
      const assistantError: AssistantError = {
        type: this.getErrorType(error),
        message: error instanceof Error ? error.message : '知识库检索失败',
        details: error,
      };

      return {
        success: false,
        error: assistantError.message,
      };
    }
  }

  /**
   * 批量检索多个查询
   */
  async batchRetrieve(
    datasetId: string,
    queries: string[],
    baseConfig?: Omit<DifyRetrievalRequest, 'query'>
  ): Promise<ApiResponse<DifyRetrievalResponse[]>> {
    try {
      const promises = queries.map(query => 
        this.retrieveKnowledge(datasetId, {
          query,
          ...baseConfig,
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => !r.success);
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} out of ${queries.length} queries failed`);
      }

      const data = results
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Batch retrieval error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量检索失败',
      };
    }
  }

  /**
   * 构建默认检索配置
   */
  static getDefaultRetrievalConfig(): DifyRetrievalRequest['retrieval_model'] {
    return {
      search_method: 'semantic_search',
      top_k: 5,
      score_threshold_enabled: true,
      score_threshold: 0.3,
      reranking_enable: false,
    };
  }

  /**
   * 构建增强检索配置（使用混合搜索和重排序）
   */
  static getEnhancedRetrievalConfig(): DifyRetrievalRequest['retrieval_model'] {
    return {
      search_method: 'hybrid_search',
      top_k: 8,
      score_threshold_enabled: true,
      score_threshold: 0.2,
      reranking_enable: true,
      reranking_model: {
        reranking_provider_name: 'cohere',
        reranking_model_name: 'rerank-multilingual-v2.0',
      },
    };
  }

  /**
   * 格式化检索结果为文本上下文
   */
  static formatRetrievalContext(
    retrievalResponse: DifyRetrievalResponse,
    options?: {
      includeMetadata?: boolean;
      maxLength?: number;
      separator?: string;
    }
  ): string {
    const { 
      includeMetadata = true, 
      maxLength = 4000, 
      separator = '\n\n---\n\n' 
    } = options || {};

    let context = retrievalResponse.records
      .map((record, index) => {
        const segment = record.segment;
        let text = segment.content;
        
        if (includeMetadata) {
          const metadata = [
            `文档: ${segment.document.name}`,
            `相关度: ${(record.score * 100).toFixed(1)}%`,
            segment.keywords.length > 0 ? `关键词: ${segment.keywords.slice(0, 3).join(', ')}` : null,
          ].filter(Boolean).join(' | ');
          
          text = `[${index + 1}] ${metadata}\n${text}`;
        }
        
        return text;
      })
      .join(separator);

    // 如果超过最大长度，进行截断
    if (context.length > maxLength) {
      context = context.substring(0, maxLength - 100) + '\n\n[内容已截断...]';
    }

    return context;
  }

  /**
   * 获取检索结果的统计信息
   */
  static getRetrievalStats(retrievalResponse: DifyRetrievalResponse) {
    const records = retrievalResponse.records;
    
    return {
      totalRecords: records.length,
      averageScore: records.length > 0 
        ? records.reduce((sum, r) => sum + r.score, 0) / records.length 
        : 0,
      highScoreCount: records.filter(r => r.score > 0.8).length,
      uniqueDocuments: new Set(records.map(r => r.segment.document_id)).size,
      totalTokens: records.reduce((sum, r) => sum + r.segment.tokens, 0),
      keywordsCoverage: Array.from(
        new Set(records.flatMap(r => r.segment.keywords))
      ),
    };
  }

  /**
   * 过滤和排序检索结果
   */
  static filterAndSortResults(
    retrievalResponse: DifyRetrievalResponse,
    options?: {
      minScore?: number;
      maxResults?: number;
      deduplicateByDocument?: boolean;
      sortBy?: 'score' | 'length' | 'tokens';
    }
  ): DifyRetrievalResponse {
    const {
      minScore = 0,
      maxResults = 10,
      deduplicateByDocument = false,
      sortBy = 'score'
    } = options || {};

    let records = [...retrievalResponse.records];

    // 按分数过滤
    if (minScore > 0) {
      records = records.filter(r => r.score >= minScore);
    }

    // 按文档去重
    if (deduplicateByDocument) {
      const seenDocuments = new Set<string>();
      records = records.filter(r => {
        if (seenDocuments.has(r.segment.document_id)) {
          return false;
        }
        seenDocuments.add(r.segment.document_id);
        return true;
      });
    }

    // 排序
    records.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        case 'length':
          return b.segment.content.length - a.segment.content.length;
        case 'tokens':
          return b.segment.tokens - a.segment.tokens;
        default:
          return 0;
      }
    });

    // 限制结果数量
    records = records.slice(0, maxResults);

    return {
      ...retrievalResponse,
      records,
    };
  }

  /**
   * 获取错误类型
   */
  private getErrorType(error: any): AssistantError['type'] {
    if (error instanceof TypeError) {
      return 'network';
    }
    
    if (error?.message?.includes('fetch')) {
      return 'network';
    }
    
    if (error?.message?.includes('retrieval') || error?.message?.includes('dataset')) {
      return 'retrieval';
    }
    
    return 'unknown';
  }

  /**
   * 测试API连接
   */
  async testConnection(datasetId: string): Promise<boolean> {
    try {
      const result = await this.retrieveKnowledge(datasetId, {
        query: 'test',
        retrieval_model: {
          search_method: 'semantic_search',
          top_k: 1,
        },
      });
      
      return result.success;
    } catch {
      return false;
    }
  }
}

// 创建默认实例的工厂函数
export function createKnowledgeAPI(baseUrl: string, apiKey: string): KnowledgeAPI {
  return new KnowledgeAPI(baseUrl, apiKey);
}

// 导出静态方法以便直接使用
export const {
  getDefaultRetrievalConfig,
  getEnhancedRetrievalConfig,
  formatRetrievalContext,
  getRetrievalStats,
  filterAndSortResults,
} = KnowledgeAPI;