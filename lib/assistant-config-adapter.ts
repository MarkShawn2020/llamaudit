/**
 * 智能助手配置适配器
 * 将现有的DifyConfig转换为AssistantConfig
 */

import { DifyConfig } from '@/types/dify-config';
import { AssistantConfig } from '@/components/knowledge-assistant/types';

/**
 * 从dataset API密钥中提取dataset ID
 */
function extractDatasetIdFromApiKey(datasetApiKey: string): string {
  // dataset API key format: dataset-{id}
  if (datasetApiKey.startsWith('dataset-')) {
    return datasetApiKey.replace('dataset-', '');
  }
  return datasetApiKey;
}

/**
 * 将DifyConfig转换为AssistantConfig
 * @param difyConfig - Dify配置
 * @param projectId - 项目ID（可选）
 */
export function adaptDifyConfigToAssistantConfig(difyConfig: DifyConfig, projectId: string = ''): AssistantConfig {
  // 从dataset API key中提取dataset ID
  const datasetId = extractDatasetIdFromApiKey(difyConfig.datasetApiKey);
  
  return {
    projectId: projectId, // 项目ID - 用于知识库API调用
    datasetId: datasetId,
    difyApiKey: difyConfig.datasetApiKey,
    difyBaseUrl: difyConfig.baseUrl,
    openRouterApiKey: 'secure-server-side', // 服务端安全处理，不需要在客户端配置
    aiModel: 'deepseek-chat', // DeepSeek模型
    maxContextLength: 4000,
    retrievalTopK: 5,
    scoreThreshold: 0.3,
  };
}

/**
 * 检查智能助手配置是否完整
 */
export function validateAssistantConfig(config: AssistantConfig): {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
} {
  const missingFields: string[] = [];
  const errors: string[] = [];

  if (!config.datasetId || config.datasetId === 'default-dataset') {
    missingFields.push('datasetId');
    errors.push('需要配置 NEXT_PUBLIC_DIFY_DATASET_ID 环境变量');
  }

  if (!config.difyApiKey) {
    missingFields.push('difyApiKey');
    errors.push('Dify API 密钥缺失');
  }

  if (!config.difyBaseUrl) {
    missingFields.push('difyBaseUrl');
    errors.push('Dify API 地址缺失');
  }

  if (!config.openRouterApiKey || config.openRouterApiKey === '') {
    missingFields.push('openRouterApiKey');
    errors.push('AI API 配置缺失，请检查服务端环境变量');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  };
}

/**
 * 获取默认的智能助手配置
 */
export function getDefaultAssistantConfig(): AssistantConfig {
  const datasetApiKey = process.env.DIFY_DATASET_API_KEY || '';
  const datasetId = extractDatasetIdFromApiKey(datasetApiKey);
  
  return {
    projectId: '', // 默认为空，需要从具体项目上下文中获取
    datasetId: datasetId,
    difyApiKey: datasetApiKey,
    difyBaseUrl: process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://api.dify.ai/v1',
    openRouterApiKey: 'secure-server-side', // 服务端安全处理
    aiModel: 'deepseek-chat',
    maxContextLength: 4000,
    retrievalTopK: 5,
    scoreThreshold: 0.3,
  };
}