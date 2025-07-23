/**
 * Dify知识库检索API路由 - 服务端安全代理（动态配置版本）
 * 为客户端提供安全的知识库检索接口，支持项目级别的Dify配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { DifyRetrievalRequest, DifyRetrievalResponse } from '@/components/knowledge-assistant/types';
import { getProjectDifyConfig, validateDifyConfig } from '@/lib/project-dify-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datasetId, query, retrieval_model, projectId } = body as {
      datasetId: string;
      query: string;
      retrieval_model?: any;
      projectId: string;
    };

    // 验证必需参数
    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

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

    // 获取项目的Dify配置
    console.log(`🔧 获取项目[${projectId}]的Dify配置...`);
    const difyConfig = await getProjectDifyConfig(projectId);
    const configValidation = validateDifyConfig(difyConfig);
    
    if (!configValidation.isValid) {
      console.error(`❌ 项目[${projectId}]Dify配置无效:`, {
        errors: configValidation.errors,
        configSource: difyConfig.configSource
      });
      
      return NextResponse.json(
        { 
          error: 'Dify配置无效',
          details: configValidation.errors,
          configSource: difyConfig.configSource,
          suggestion: difyConfig.configSource === 'none' 
            ? '请在项目设置中配置Dify API信息' 
            : '请检查Dify配置的有效性'
        },
        { status: 500 }
      );
    }

    console.log('🔍 开始Dify知识库检索（动态配置）:', {
      projectId,
      datasetId: datasetId.substring(0, 8) + '...',
      query: query.substring(0, 100),
      configSource: difyConfig.configSource,
      difyBaseUrl: difyConfig.difyBaseUrl
    });

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
    const response = await fetch(`${difyConfig.difyBaseUrl}/datasets/${datasetId}/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyConfig.difyDatasetApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retrievalRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      console.error('❌ Dify API错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        projectId,
        configSource: difyConfig.configSource
      });

      // 特殊处理401错误
      if (response.status === 401) {
        console.error('🚨 Dify API认证失败:', {
          projectId,
          configSource: difyConfig.configSource,
          suggestion: difyConfig.configSource === 'database' 
            ? '请检查项目Dify配置中的API密钥' 
            : '请检查环境变量中的API密钥'
        });
      }

      throw new Error(
        errorData.message || 
        errorData.error || 
        `Dify API请求失败: ${response.status}`
      );
    }

    const data: DifyRetrievalResponse = await response.json();

    // 过滤和验证结果
    if (!data.records || !Array.isArray(data.records)) {
      console.warn('⚠️ Dify API返回格式异常:', data);
      return NextResponse.json({
        query: { content: query },
        records: [],
        metadata: {
          configSource: difyConfig.configSource,
          projectId
        }
      });
    }

    // 增强响应数据
    const enhancedResult = {
      ...data,
      metadata: {
        configSource: difyConfig.configSource,
        projectId,
        recordCount: data.records.length,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ Dify知识库检索完成:', {
      projectId,
      recordCount: data.records.length,
      configSource: difyConfig.configSource
    });

    return NextResponse.json(enhancedResult);

  } catch (error) {
    console.error('❌ Dify检索API错误:', error);
    
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