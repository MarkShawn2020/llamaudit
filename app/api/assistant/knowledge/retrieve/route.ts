/**
 * 知识库检索 API 路由 - 支持动态Dify配置
 * 为增强的知识检索系统提供服务端代理，支持项目级别的Dify配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { DifyRetrievalRequest, DifyRetrievalResponse } from '@/components/knowledge-assistant/types';
import { getProjectDifyConfig, validateDifyConfig, getDifyConfigSummary } from '@/lib/project-dify-config';

export async function POST(request: NextRequest) {
  try {
    const { 
      datasetId, 
      projectId, 
      retrievalRequest,
      // 🚀 新增：支持前端自定义配置透传
      customConfig
    } = await request.json();

    // 验证必需参数
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    if (!retrievalRequest || !retrievalRequest.query) {
      return NextResponse.json(
        { error: '检索请求内容不能为空' },
        { status: 400 }
      );
    }

    // 获取项目的Dify配置
    console.log(`🔧 获取项目[${projectId}]的Dify配置...`);
    console.log(`🔍 知识库检索API接收到的参数详情:`, {
      projectId: {
        value: projectId,
        type: typeof projectId,
        length: projectId?.length,
        isValidUUID: projectId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId) : false
      },
      datasetId: datasetId,
      retrievalQuery: retrievalRequest?.query?.substring(0, 50) + '...',
      hasCustomConfig: !!customConfig,
      customConfigSummary: customConfig ? {
        hasBaseUrl: !!customConfig.difyBaseUrl,
        hasApiKey: !!customConfig.difyDatasetApiKey,
        baseUrl: customConfig.difyBaseUrl
      } : null
    });
    
    // 获取基础配置（数据库或环境变量）
    let difyConfig = await getProjectDifyConfig(projectId);
    
    // 🚀 配置优先级：前端自定义配置 > 数据库配置 > 环境变量配置
    if (customConfig) {
      console.log('🔧 应用前端自定义Dify配置透传:', {
        originalConfigSource: difyConfig.configSource,
        customBaseUrl: customConfig.difyBaseUrl,
        customApiKeyExists: !!customConfig.difyDatasetApiKey
      });
      
      // 使用自定义配置覆盖数据库配置
      if (customConfig.difyBaseUrl) {
        difyConfig.difyBaseUrl = customConfig.difyBaseUrl;
      }
      if (customConfig.difyDatasetApiKey) {
        difyConfig.difyDatasetApiKey = customConfig.difyDatasetApiKey;
      }
      
      // 更新配置来源标记
      difyConfig.configSource = 'frontend-custom';
      difyConfig.hasValidConfig = !!(difyConfig.difyBaseUrl && difyConfig.difyDatasetApiKey);
      
      console.log('✅ 自定义配置应用完成:', {
        finalBaseUrl: difyConfig.difyBaseUrl,
        hasApiKey: !!difyConfig.difyDatasetApiKey,
        configSource: difyConfig.configSource,
        isValid: difyConfig.hasValidConfig
      });
    }
    const configValidation = validateDifyConfig(difyConfig);
    
    if (!configValidation.isValid) {
      console.error(`❌ 项目[${projectId}]Dify配置无效:`, {
        errors: configValidation.errors,
        configSummary: getDifyConfigSummary(difyConfig)
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

    // 使用项目配置或从请求中获取数据集ID
    const finalDatasetId = datasetId || difyConfig.datasetId;
    if (!finalDatasetId) {
      return NextResponse.json(
        { error: '数据集ID不能为空，请确保项目已关联Dify数据集' },
        { status: 400 }
      );
    }

    const difyUrl = `${difyConfig.difyBaseUrl}/datasets/${finalDatasetId}/retrieve`;

    console.log('🔍 开始Dify知识库检索（动态配置）:', {
      projectId,
      datasetId: finalDatasetId.substring(0, 8) + '...',
      query: retrievalRequest.query.substring(0, 100),
      searchMethod: retrievalRequest.retrieval_model?.search_method,
      configSource: difyConfig.configSource,
      difyBaseUrl: difyConfig.difyBaseUrl,
      hasValidConfig: difyConfig.hasValidConfig
    });

    const startTime = Date.now();

    // 构建Dify API请求
    const difyRequest: DifyRetrievalRequest = {
      query: retrievalRequest.query,
      // todo: more config
    };

    // 调用 Dify API
    const difyResponse = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${difyConfig.difyDatasetApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LlamaAudit-Assistant/1.0.0',
      },
      body: JSON.stringify(difyRequest),
      signal: AbortSignal.timeout(10000) // 10秒超时
    });

    const responseTime = Date.now() - startTime;

    if (!difyResponse.ok) {
      const errorData = await difyResponse.json().catch(() => ({}));
      
      // 详细的错误诊断
      const errorDiagnosis = {
        status: difyResponse.status,
        statusText: difyResponse.statusText,
        error: errorData,
        requestDetails: {
          url: difyUrl,
          method: 'POST',
          hasApiKey: !!difyConfig.difyDatasetApiKey,
          datasetId: finalDatasetId,
          projectId: projectId,
          configSource: difyConfig.configSource
        }
      };
      
      console.error('❌ Dify API错误详细诊断:', errorDiagnosis);
      
      // 特殊处理401错误
      if (difyResponse.status === 401) {
        console.error('🚨 401认证失败详细分析:', {
          projectId,
          datasetId: finalDatasetId,
          configSource: difyConfig.configSource,
          difyUrl,
          possibleCauses: [
            '1. 项目Dify配置中的API密钥无效或已过期',
            '2. API密钥没有访问该数据集的权限',
            '3. 数据集ID不存在或格式错误',
            '4. Dify数据集服务配置问题',
            '5. 项目配置需要更新'
          ],
          resolution: difyConfig.configSource === 'database' 
            ? '请在项目设置中更新Dify配置' 
            : '请联系管理员检查环境配置'
        });
      }

      return NextResponse.json(
        { 
          error: errorData.message || `Dify API请求失败: ${difyResponse.status}`,
          details: errorData,
          diagnosis: errorDiagnosis,
          configSource: difyConfig.configSource
        },
        { status: difyResponse.status }
      );
    }

    const difyResult: DifyRetrievalResponse = await difyResponse.json();

    // 验证响应格式
    if (!difyResult.records) {
      console.warn('⚠️ Dify API返回格式异常:', difyResult);
      return NextResponse.json({
        query: difyResult.query || { content: retrievalRequest.query },
        records: [],
        metadata: {
          responseTime,
          source: 'dify-api',
          timestamp: new Date().toISOString(),
          configSource: difyConfig.configSource,
          warning: 'Dify API返回格式异常'
        }
      });
    }

    // 增强响应数据
    const enhancedResult = {
      ...difyResult,
      metadata: {
        responseTime,
        totalRecords: difyResult.records.length,
        source: 'dify-api',
        timestamp: new Date().toISOString(),
        configSource: difyConfig.configSource,
        projectId,
        searchConfig: {
          method: difyRequest.retrieval_model?.search_method || 'hybrid_search',
          topK: difyRequest.retrieval_model?.top_k || 5,
          scoreThreshold: difyRequest.retrieval_model?.score_threshold || 0.3,
          rerankingEnabled: difyRequest.retrieval_model?.reranking_enable || true
        }
      }
    };

    console.log('✅ Dify知识库检索完成:', {
      projectId,
      recordCount: difyResult.records.length,
      responseTime: `${responseTime}ms`,
      configSource: difyConfig.configSource,
      avgScore: difyResult.records.length > 0 ? 
        (difyResult.records.reduce((sum, record) => sum + (record.score || 0), 0) / difyResult.records.length).toFixed(4) : 
        'N/A'
    });

    return NextResponse.json(enhancedResult);

  } catch (error) {
    console.error('❌ 知识库检索API错误:', error);
    
    let errorMessage = '知识库检索失败';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 处理特定错误类型
      if (error.name === 'AbortError') {
        errorMessage = '知识库检索请求超时';
        statusCode = 408;
      } else if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到Dify服务';
        statusCode = 503;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        service: 'knowledge-retrieval-api'
      },
      { status: statusCode }
    );
  }
}

/**
 * 获取知识库检索配置信息
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: '项目ID不能为空' },
      { status: 400 }
    );
  }

  try {
    const difyConfig = await getProjectDifyConfig(projectId);
    const configSummary = getDifyConfigSummary(difyConfig);

    return NextResponse.json({
      service: 'knowledge-retrieval',
      version: '2.0.0',
      features: [
        'Dynamic project-level Dify configuration',
        'Multiple search methods (keyword, semantic, full-text, hybrid)',
        'Reranking support with Jina model',
        'Score threshold filtering',
        'Metadata filtering',
        'Response caching',
        'Performance monitoring'
      ],
      supportedSearchMethods: [
        'keyword_search',
        'semantic_search', 
        'full_text_search',
        'hybrid_search'
      ],
      defaultConfig: {
        search_method: 'hybrid_search',
        top_k: 5,
        score_threshold: 0.3,
        reranking_enable: true,
        weights: 0.7
      },
      limits: {
        maxTopK: 20,
        maxQueryLength: 500,
        timeout: 10000
      },
      projectConfig: configSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取知识库检索配置失败:', error);
    return NextResponse.json(
      { error: '获取配置信息失败' },
      { status: 500 }
    );
  }
}