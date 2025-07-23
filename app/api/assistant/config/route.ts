/**
 * 智能助手配置API - 项目上下文感知
 * 根据项目ID返回安全的配置信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/actions/project-actions';
import { AssistantConfig } from '@/components/knowledge-assistant/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID参数缺失' },
        { status: 400 }
      );
    }

    // 获取项目信息（包含datasetId）
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 验证必要的环境变量
    const difyDatasetApiKey = process.env.DIFY_DATASET_API_KEY;
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const difyApiUrl = process.env.NEXT_PUBLIC_DIFY_API_URL;

    if (!difyDatasetApiKey) {
      return NextResponse.json(
        { error: 'Dify数据集API密钥未配置' },
        { status: 500 }
      );
    }

    if (!deepseekApiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API密钥未配置' },
        { status: 500 }
      );
    }

    if (!project.datasetId) {
      return NextResponse.json(
        { error: '项目未关联知识库，请先在项目管理页面创建知识库' },
        { status: 400 }
      );
    }

    // 构建安全的配置（不包含真实API密钥）
    const config: AssistantConfig = {
      datasetId: project.datasetId, // 使用项目特定的数据集ID
      difyApiKey: 'server-side-configured', // 占位符，真实密钥在服务端
      difyBaseUrl: difyApiUrl || 'https://api.dify.ai/v1',
      openRouterApiKey: 'server-side-configured', // 占位符
      aiModel: 'deepseek-chat',
      maxContextLength: 4000,
      retrievalTopK: 5,
      scoreThreshold: 0.3,
    };

    // 返回配置信息，包含项目上下文
    return NextResponse.json({
      config,
      project: {
        id: project.id,
        name: project.name,
        datasetId: project.datasetId,
      },
      status: 'configured'
    });

  } catch (error) {
    console.error('Assistant config API error:', error);
    return NextResponse.json(
      { error: '获取助手配置失败' },
      { status: 500 }
    );
  }
}

/**
 * 验证配置的完整性
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID参数缺失' },
        { status: 400 }
      );
    }

    // 获取项目信息
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ valid: false, error: '项目不存在' });
    }

    // 验证配置
    const issues: string[] = [];
    
    if (!project.datasetId) {
      issues.push('项目未关联知识库');
    }

    if (!process.env.DIFY_DATASET_API_KEY) {
      issues.push('Dify数据集API密钥未配置');
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      issues.push('DeepSeek API密钥未配置');
    }

    const isValid = issues.length === 0;

    return NextResponse.json({
      valid: isValid,
      issues,
      project: {
        id: project.id,
        name: project.name,
        hasDataset: !!project.datasetId,
      }
    });

  } catch (error) {
    console.error('Config validation error:', error);
    return NextResponse.json({
      valid: false,
      error: '配置验证失败'
    });
  }
}