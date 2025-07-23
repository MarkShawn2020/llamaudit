/**
 * 增强的知识库检索服务
 * 专为流式对话系统优化
 */

import { DifyRetrievalRequest, DifyRetrievalResponse } from '@/components/knowledge-assistant/types';

export interface EnhancedRetrievalOptions {
  datasetId: string;
  projectId: string;
  searchMethod?: 'keyword_search' | 'semantic_search' | 'full_text_search' | 'hybrid_search';
  topK?: number;
  scoreThreshold?: number;
  enableReranking?: boolean;
  contextWindowSize?: number;
}

export interface RetrievalMetadata {
  queryTime: number;
  totalResults: number;
  filteredResults: number;
  avgScore: number;
  searchMethod: string;
  timestamp: string;
}

export interface EnhancedRetrievalResult {
  records: any[];
  metadata: RetrievalMetadata;
  query: {
    original: string;
    processed: string;
  };
  success: boolean;
  error?: string;
}

/**
 * 增强的知识库检索类
 */
export class EnhancedKnowledgeRetrieval {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = '/api/assistant/knowledge'; // 使用服务端代理
    this.timeout = 10000; // 10秒超时
  }

  /**
   * 执行知识库检索
   */
  async retrieveKnowledge(
    query: string,
    options: EnhancedRetrievalOptions
  ): Promise<EnhancedRetrievalResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 开始增强知识库检索:', { 
        query: query.substring(0, 100),
        options: { ...options, datasetId: options.datasetId.substring(0, 8) + '...' }
      });

      // 预处理查询
      const processedQuery = this.preprocessQuery(query);

      // 构建检索请求
      const retrievalRequest: DifyRetrievalRequest = {
        query: processedQuery,
        retrieval_model: {
          search_method: options.searchMethod || 'hybrid_search',
          top_k: Math.min(options.topK || 5, 20), // 限制最大返回数量
          score_threshold: options.scoreThreshold || 0.3,
          score_threshold_enabled: (options.scoreThreshold !== undefined),
          reranking_enable: options.enableReranking || true,
          reranking_model: options.enableReranking ? {
            reranking_provider_name: 'jina',
            reranking_model_name: 'jina-reranker-v1-base-en'
          } : undefined,
          weights: options.searchMethod === 'hybrid_search' ? 0.7 : undefined, // 语义搜索权重
        }
      };

      // 调用API
      const response = await fetch(`${this.baseUrl}/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: options.datasetId,
          projectId: options.projectId,
          retrievalRequest
        }),
        signal: AbortController.prototype.constructor ? 
          AbortSignal.timeout(this.timeout) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const rawResult: DifyRetrievalResponse = await response.json();
      
      // 处理和增强结果  
      const enhancedResult = this.enhanceResults(rawResult, processedQuery, query, startTime, options);
      
      console.log('✅ 知识库检索完成:', {
        totalResults: enhancedResult.metadata.totalResults,
        filteredResults: enhancedResult.metadata.filteredResults,
        avgScore: enhancedResult.metadata.avgScore.toFixed(4),
        queryTime: enhancedResult.metadata.queryTime
      });

      return enhancedResult;

    } catch (error) {
      const queryTime = Date.now() - startTime;
      console.error('❌ 知识库检索失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '知识库检索失败';
      
      return {
        records: [],
        metadata: {
          queryTime,
          totalResults: 0,
          filteredResults: 0,
          avgScore: 0,
          searchMethod: options.searchMethod || 'hybrid_search',
          timestamp: new Date().toISOString()
        },
        query: {
          original: query,
          processed: this.preprocessQuery(query)
        },
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 预处理查询文本
   */
  private preprocessQuery(query: string): string {
    // 移除多余空格和特殊字符
    let processed = query.trim().replace(/\s+/g, ' ');
    
    // 检测中英文混合查询并优化
    const hasChinese = /[\u4e00-\u9fa5]/.test(processed);
    const hasEnglish = /[a-zA-Z]/.test(processed);
    
    if (hasChinese && hasEnglish) {
      // 为中英文混合查询添加额外的搜索关键词
      processed = processed + ' ' + this.extractKeywords(processed);
    }

    // 限制查询长度
    if (processed.length > 200) {
      processed = processed.substring(0, 200).trim();
    }

    return processed;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string {
    // 简单的关键词提取逻辑
    const keywords = text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word))
      .slice(0, 5);
    
    return keywords.join(' ');
  }

  /**
   * 停用词检查
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '的', '是', '在', '有', '和', '或', '但', '这', '那', '如何', '什么', '为什么', '怎样'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * 增强检索结果
   */
  private enhanceResults(
    rawResult: DifyRetrievalResponse,
    processedQuery: string,
    originalQuery: string,
    startTime: number,
    options: EnhancedRetrievalOptions
  ): EnhancedRetrievalResult {
    const queryTime = Date.now() - startTime;
    const records = rawResult.records || [];
    
    // 过滤低质量结果
    const filteredRecords = records.filter(record => {
      const score = record.score || 0;
      const content = record.segment?.content || '';
      
      // 基本质量过滤
      return score > 0.1 && content.length > 10;
    });

    // 按相关性重新排序
    const sortedRecords = filteredRecords.sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      
      // 优先考虑更高的相关性分数
      if (Math.abs(scoreA - scoreB) > 0.01) {
        return scoreB - scoreA;
      }
      
      // 相同分数时，优先考虑更长的内容（通常更详细）
      const lengthA = a.segment?.content?.length || 0;
      const lengthB = b.segment?.content?.length || 0;
      return lengthB - lengthA;
    });

    // 计算统计信息
    const scores = filteredRecords.map(r => r.score || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // 添加上下文增强
    const enhancedRecords = this.addContextEnhancement(sortedRecords, originalQuery);

    return {
      records: enhancedRecords,
      metadata: {
        queryTime,
        totalResults: records.length,
        filteredResults: filteredRecords.length,
        avgScore,
        searchMethod: options.searchMethod || 'hybrid_search',
        timestamp: new Date().toISOString()
      },
      query: {
        original: originalQuery,
        processed: processedQuery
      },
      success: true
    };
  }

  /**
   * 添加上下文增强
   */
  private addContextEnhancement(records: any[], query: string): any[] {
    return records.map(record => {
      const segment = record.segment;
      if (!segment) return record;

      // 添加相关性解释
      const relevanceExplanation = this.generateRelevanceExplanation(
        segment.content,
        query,
        record.score
      );

      // 添加上下文提示
      const contextHints = this.generateContextHints(segment);

      return {
        ...record,
        enhanced: {
          relevanceExplanation,
          contextHints,
          processedAt: new Date().toISOString()
        }
      };
    });
  }

  /**
   * 生成相关性解释
   */
  private generateRelevanceExplanation(content: string, query: string, score: number): string {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    const matchedWords = queryWords.filter(word => 
      word.length > 2 && contentLower.includes(word)
    );

    if (matchedWords.length === 0) {
      return '语义相关性匹配';
    }

    return `关键词匹配: ${matchedWords.join(', ')} (相关性: ${(score * 100).toFixed(1)}%)`;
  }

  /**
   * 生成上下文提示
   */
  private generateContextHints(segment: any): string[] {
    const hints: string[] = [];
    
    if (segment.document?.name) {
      hints.push(`来源文档: ${segment.document.name}`);
    }
    
    if (segment.position) {
      hints.push(`文档位置: 第${segment.position}段`);
    }
    
    if (segment.word_count) {
      hints.push(`字数: ${segment.word_count}`);
    }

    return hints;
  }

  /**
   * 批量检索（用于复杂查询）
   */
  async batchRetrieve(
    queries: string[],
    options: EnhancedRetrievalOptions
  ): Promise<EnhancedRetrievalResult[]> {
    console.log('🔍 开始批量知识库检索:', { queryCount: queries.length });
    
    const results = await Promise.allSettled(
      queries.map(query => this.retrieveKnowledge(query, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`批量检索第${index + 1}个查询失败:`, result.reason);
        return {
          records: [],
          metadata: {
            queryTime: 0,
            totalResults: 0,
            filteredResults: 0,
            avgScore: 0,
            searchMethod: options.searchMethod || 'hybrid_search',
            timestamp: new Date().toISOString()
          },
          query: {
            original: queries[index],
            processed: queries[index]
          },
          success: false,
          error: result.reason instanceof Error ? result.reason.message : '批量检索失败'
        };
      }
    });
  }
}

/**
 * 默认的增强知识检索实例
 */
export const enhancedKnowledgeRetrieval = new EnhancedKnowledgeRetrieval();

export default EnhancedKnowledgeRetrieval;