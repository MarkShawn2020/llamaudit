/**
 * Dify 知识库检索工具函数
 * 用于 AI SDK 的工具系统，集成现有的 Dify API
 */

import { DifyRetrievalResponse } from '@/components/knowledge-assistant/types';

export interface KnowledgeRetrievalParams {
  query: string;
  projectId: string;
  datasetId?: string;
  searchMethod?: 'keyword_search' | 'semantic_search' | 'full_text_search' | 'hybrid_search';
  topK?: number;
  scoreThreshold?: number;
}

export interface KnowledgeRetrievalResult {
  success: boolean;
  data?: DifyRetrievalResponse;
  error?: string;
  relevantDocuments?: string[];
}

/**
 * 调用 Dify 知识库检索 API
 */
export async function retrieveKnowledge(params: KnowledgeRetrievalParams): Promise<KnowledgeRetrievalResult> {
  try {
    const { query, projectId, datasetId, searchMethod = 'hybrid_search', topK = 5, scoreThreshold = 0.3 } = params;
    
    console.log('🔍 开始知识库检索:', {
      query: query.substring(0, 100),
      projectId,
      searchMethod,
      topK
    });

    // 构建检索请求
    const retrievalRequest = {
      query,
      retrieval_model: {
        search_method: searchMethod,
        reranking_enable: true,
        top_k: topK,
        score_threshold_enabled: true,
        score_threshold: scoreThreshold,
        weights: searchMethod === 'hybrid_search' ? 0.7 : undefined
      }
    };

    // 调用现有的知识库检索 API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/assistant/knowledge/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        datasetId,
        retrievalRequest
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `检索请求失败: ${response.status}`);
    }

    const data: DifyRetrievalResponse = await response.json();

    // 提取相关文档内容用于 AI 上下文
    const relevantDocuments = data.records?.map(record => {
      const segment = record.segment;
      return `[文档: ${segment.document?.name || '未知'}]\n${segment.content}\n相关性: ${record.score?.toFixed(4) || 'N/A'}`;
    }) || [];

    console.log('✅ 知识库检索完成:', {
      recordCount: data.records?.length || 0,
      hasMetadata: !!(data as any).metadata
    });

    return {
      success: true,
      data,
      relevantDocuments
    };

  } catch (error) {
    console.error('❌ 知识库检索失败:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '知识库检索失败',
      relevantDocuments: []
    };
  }
}

/**
 * 格式化知识库检索结果为 AI 可读的上下文
 */
export function formatKnowledgeContext(retrievalResult: KnowledgeRetrievalResult): string {
  if (!retrievalResult.success || !retrievalResult.data?.records?.length) {
    return '未找到相关的知识库内容。';
  }

  const { records } = retrievalResult.data;
  
  const contextParts = records.map((record, index) => {
    const segment = record.segment;
    const score = record.score ? `(相关性: ${(record.score * 100).toFixed(1)}%)` : '';
    
    return `## 文档 ${index + 1}: ${segment.document?.name || '未知文档'} ${score}

${segment.content.trim()}

---`;
  });

  return `基于知识库检索到以下相关内容：

${contextParts.join('\n\n')}

请基于以上内容回答用户的问题。如果上述内容不能完全回答问题，请明确说明哪些信息无法从知识库中获取。`;
}