/**
 * 项目数据集创建API
 * 使用项目的Dify配置创建知识库
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/actions/project-actions';
import { DifyDatasetAPI } from '@/lib/api/dify-dataset-api';
import { DEFAULT_DIFY_CONFIGS } from '@/types/dify-config';

interface CreateDatasetRequest {
  name: string;
  description?: string;
  indexing_technique?: 'high_quality' | 'economy';
  permission?: 'only_me' | 'all_team_members';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = params.id;
  
  try {
    // 获取项目信息
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 解析请求体
    const body: CreateDatasetRequest = await request.json();
    const { name, description, indexing_technique = 'high_quality', permission = 'only_me' } = body;

    if (!name) {
      return NextResponse.json(
        { error: '数据集名称不能为空' },
        { status: 400 }
      );
    }

    // 获取项目的Dify配置
    const difyConfig = await getProjectDifyConfig(projectId);
    
    // 创建DifyDatasetAPI实例
    const api = new DifyDatasetAPI(difyConfig);
    
    // 创建数据集
    const dataset = await api.createDataset({
      name,
      description: description || `项目"${project.name}"的知识库`,
      indexing_technique,
      permission,
    });

    console.log(`✅ 为项目 ${projectId} 创建数据集成功:`, {
      datasetId: dataset.id,
      name: dataset.name,
      config: { baseUrl: difyConfig.baseUrl, environment: difyConfig.environment }
    });

    return NextResponse.json({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      indexing_technique: dataset.indexing_technique,
      permission: dataset.permission,
      created_at: dataset.created_at,
    });

  } catch (error) {
    console.error(`❌ 项目 ${projectId} 数据集创建失败:`, error);
    
    const errorMessage = error instanceof Error ? error.message : '数据集创建失败';
    
    // 处理常见错误
    if (errorMessage.includes('already exists')) {
      return NextResponse.json(
        { error: '数据集名称已存在，请使用其他名称' },
        { status: 409 }
      );
    }
    
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return NextResponse.json(
        { error: 'Dify API密钥无效或已过期' },
        { status: 401 }
      );
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return NextResponse.json(
        { error: 'Dify API密钥权限不足' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 获取项目的Dify配置
 * 优先级: 项目自定义配置 > 默认云端配置
 */
async function getProjectDifyConfig(projectId: string) {
  try {
    // 尝试获取项目的自定义Dify配置
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects/${projectId}/dify-config`);
    
    if (response.ok) {
      const projectConfig = await response.json();
      
      // 如果项目有自定义配置且有API密钥
      if (projectConfig.hasApiKey && projectConfig.difyBaseUrl && projectConfig.difyDatasetApiKey) {
        return {
          baseUrl: projectConfig.difyBaseUrl,
          apiKey: '', // 不在数据集API中使用
          datasetApiKey: projectConfig.difyDatasetApiKey,
          environment: 'custom' as const,
        };
      }
    }
  } catch (error) {
    console.warn(`获取项目 ${projectId} 的Dify配置失败，使用默认配置:`, error);
  }

  // 使用环境变量或默认配置
  const environment = process.env.DIFY_ENVIRONMENT as 'local' | 'cloud' || 'cloud';
  const defaultConfig = DEFAULT_DIFY_CONFIGS[environment];
  
  return {
    ...defaultConfig,
    datasetApiKey: process.env.DIFY_DATASET_API_KEY || process.env.NEXT_PUBLIC_DIFY_DATASET_API_KEY || defaultConfig.datasetApiKey,
  };
}

