/**
 * Dify知识库检索API路由 - 服务端安全代理
 * 为客户端提供安全的知识库检索接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { DifyRetrievalRequest, DifyRetrievalResponse } from '@/components/knowledge-assistant/types';

const DIFY_API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_DATASET_API_KEY = process.env.DIFY_DATASET_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datasetId, query, retrieval_model } = body as {
      datasetId: string;
      query: string;
      retrieval_model?: any;
    };

    // 验证参数
    if (!datasetId) {
      return NextResponse.json(
        { error: '数据集ID不能为空' },
        { status: 400 }
      );
    }

    if (!query?.trim()) {
      return NextResponse.json(
        { error: '查询内容不能为空' },
        { status: 400 }
      );
    }

    if (!DIFY_DATASET_API_KEY) {
      return NextResponse.json(
        { error: 'Dify数据集API密钥未配置' },
        { status: 500 }
      );
    }

    // 构建检索请求
    const retrievalRequest: DifyRetrievalRequest = {
      query: query.trim(),
      retrieval_model: retrieval_model || {
        search_method: 'semantic_search',
        top_k: 5,
        score_threshold: 0.3,
        score_threshold_enabled: true,
        reranking_enable: false,
      },
    };

    // 调用Dify API
    const response = await fetch(`${DIFY_API_URL}/datasets/${datasetId}/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_DATASET_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retrievalRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Dify API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      throw new Error(
        errorData.message || 
        errorData.error || 
        `Dify API请求失败: ${response.status}`
      );
    }

    const data: DifyRetrievalResponse = await response.json();

    // 过滤和验证结果
    if (!data.records || !Array.isArray(data.records)) {
      console.warn('Dify API returned invalid data structure:', data);
      return NextResponse.json({
        query: { content: query },
        records: [],
      });
    }

    // 返回结果
    return NextResponse.json(data);

  } catch (error) {
    console.error('Dify retrieve API error:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : '知识库检索失败';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}