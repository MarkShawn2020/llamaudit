/**
 * 安全的知识库API客户端
 * 通过内部API路由访问Dify，不暴露API密钥到客户端
 */

import { DifyRetrievalRequest, DifyRetrievalResponse, ApiResponse } from '@/components/knowledge-assistant/types';

export class SecureKnowledgeAPI {
  private baseUrl: string;

  constructor() {
    // 使用内部API路由
    this.baseUrl = '/api/dify';
  }

  /**
   * 检索知识库
   */
  async retrieveKnowledge(
    datasetId: string,
    request: DifyRetrievalRequest
  ): Promise<ApiResponse<DifyRetrievalResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId,
          query: request.query,
          retrieval_model: request.retrieval_model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `知识库检索请求失败: ${response.status}`
        );
      }

      const data: DifyRetrievalResponse = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Secure Knowledge API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '知识库检索失败',
      };
    }
  }

  /**
   * 过滤和排序检索结果
   */
  static filterAndSortResults(
    response: DifyRetrievalResponse,
    options: {
      minScore?: number;
      maxResults?: number;
      deduplicateByDocument?: boolean;
      sortBy?: 'score' | 'position';
    } = {}
  ): DifyRetrievalResponse {
    const {
      minScore = 0,
      maxResults = 5,
      deduplicateByDocument = true,
      sortBy = 'score'
    } = options;

    let records = response.records || [];

    // 过滤低分结果
    if (minScore > 0) {
      records = records.filter(record => record.score >= minScore);
    }

    // 按文档去重
    if (deduplicateByDocument) {
      const seenDocuments = new Set<string>();
      records = records.filter(record => {
        const docId = record.segment.document.id;
        if (seenDocuments.has(docId)) {
          return false;
        }
        seenDocuments.add(docId);
        return true;
      });
    }

    // 排序
    records.sort((a, b) => {
      if (sortBy === 'score') {
        return b.score - a.score; // 高分在前
      } else {
        return a.segment.position - b.segment.position; // 位置排序
      }
    });

    // 限制结果数量
    if (maxResults > 0) {
      records = records.slice(0, maxResults);
    }

    return {
      ...response,
      records,
    };
  }

  /**
   * 格式化检索上下文
   */
  static formatRetrievalContext(
    response: DifyRetrievalResponse,
    options: {
      includeMetadata?: boolean;
      maxLength?: number;
      separator?: string;
    } = {}
  ): string {
    const {
      includeMetadata = true,
      maxLength = 2000,
      separator = '\n\n---\n\n'
    } = options;

    const records = response.records || [];
    if (records.length === 0) {
      return '暂无相关信息。';
    }

    let context = '';
    let currentLength = 0;

    for (const record of records) {
      const segment = record.segment;
      let content = segment.content;

      // 添加元数据
      if (includeMetadata) {
        const metadata = `[来源: ${segment.document.name}, 相关性: ${(record.score * 100).toFixed(1)}%]`;
        content = `${metadata}\n${content}`;
      }

      // 检查长度限制
      const newLength = currentLength + content.length + separator.length;
      if (maxLength > 0 && newLength > maxLength) {
        // 截断内容以适应长度限制
        const remainingLength = maxLength - currentLength - separator.length;
        if (remainingLength > 100) { // 至少保留100字符
          content = content.substring(0, remainingLength) + '...';
        } else {
          break; // 无法添加更多内容
        }
      }

      if (context) {
        context += separator;
      }
      context += content;
      currentLength = context.length;

      if (maxLength > 0 && currentLength >= maxLength) {
        break;
      }
    }

    return context;
  }

  /**
   * 获取检索统计信息
   */
  static getRetrievalStats(response: DifyRetrievalResponse) {
    const records = response.records || [];
    
    if (records.length === 0) {
      return {
        totalResults: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        uniqueDocuments: 0,
      };
    }

    const scores = records.map(r => r.score);
    const uniqueDocuments = new Set(records.map(r => r.segment.document.id)).size;

    return {
      totalResults: records.length,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      uniqueDocuments,
    };
  }

  /**
   * 验证API连接
   */
  async testConnection(datasetId: string): Promise<ApiResponse<boolean>> {
    try {
      const testResult = await this.retrieveKnowledge(datasetId, {
        query: 'test',
        retrieval_model: {
          search_method: 'semantic_search',
          top_k: 1,
          score_threshold: 0.1,
          score_threshold_enabled: false,
        },
      });

      return {
        success: testResult.success,
        data: testResult.success,
        error: testResult.error,
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : '连接测试失败',
      };
    }
  }
}

// 导出统一实例
export const secureKnowledgeAPI = new SecureKnowledgeAPI();

// 保持兼容性的默认配置函数
export function getDefaultRetrievalConfig() {
  return {
    search_method: 'semantic_search' as const,
    top_k: 5,
    score_threshold: 0.3,
    score_threshold_enabled: true,
    reranking_enable: false,
  };
}

export function getEnhancedRetrievalConfig() {
  return {
    search_method: 'hybrid_search' as const,
    top_k: 8,
    score_threshold: 0.2,
    score_threshold_enabled: true,
    reranking_enable: true,
  };
}