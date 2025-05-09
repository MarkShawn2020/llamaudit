'use server';

import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';
import { AnalysisResult, GroupedResults } from '@/components/projects/types';

// Dify API配置
const NEXT_PUBLIC_DIFY_API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// SSE事件类型
export type SSEEventType = 'message' | 'error' | 'start' | 'end' | 'done' | 'meta' | 'ping' | 'provider_response';

// Dify SSE消息结构
export interface DifySSEMessage {
  event: string;
  task_id?: string;
  id?: string;
  answer?: string;
  message_id?: string;
  conversation_id?: string;
  created_at?: number;
  metadata?: any;
  // 可能的错误信息
  status?: string;
  message?: string;
  code?: string;
}

// 流式响应进度回调
export type StreamProgressCallback = (message: DifySSEMessage) => void;

/**
 * 发送文件分析请求到Dify API (阻塞模式)
 * 
 * 使用Dify的chat-messages接口分析上传的文件，并提取"三重一大"相关信息
 * 此方法使用阻塞模式，等待完整结果返回
 */
export async function analyzeDifyFiles(fileIds: string[]): Promise<GroupedResults> {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      logger.error('未授权访问');
      throw new Error('未授权访问');
    }

    if (!DIFY_API_KEY) {
      logger.error('缺少Dify API密钥');
      throw new Error('系统配置错误: 缺少Dify API Key');
    }

    if (fileIds.length === 0) {
      logger.warn('没有提供文件ID');
      return {
        majorDecisions: [],
        personnelAppointments: [],
        majorProjects: [],
        largeAmounts: []
      };
    }

    logger.info('开始通过Dify分析文件', { 
      userId: user.id, 
      fileCount: fileIds.length,
      fileIds 
    });

    // 构建请求体
    const requestBody = {
      query: "请分析这些文件中的'三重一大'内容（重大决策、重要干部任免、重大项目、大额资金）并提取详细信息",
      user: user.id,
      response_mode: "blocking", // 使用阻塞模式，等待完整响应
      conversationId: "en9SlHU5dpHbJxdl", // 使用固定会话ID以便追踪上下文
      files: fileIds.map(id => ({
        type: "document",
        transfer_method: "local_file",
        id: id
      }))
    };

    // 发送请求到Dify API
    const response = await fetch(`${NEXT_PUBLIC_DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Dify API返回错误', {
        status: response.status,
        error: errorText
      });
      throw new Error(`Dify API错误: ${response.status} - ${errorText}`);
    }

    // 处理API响应
    const data = await response.json();
    logger.info('收到Dify分析结果', { responseId: data.id });

    // 解析Dify响应中的结果
    // 注意：这里假设Dify会以JSON格式返回结构化的分析结果
    // 实际实现可能需要根据Dify的具体响应格式调整
    let analysisResults: AnalysisResult[] = [];
    
    try {
      if (data.answer) {
        // 尝试从answer中提取JSON格式的结果
        // 这里假设Dify会返回结构化的JSON字符串
        // 可能需要正则表达式来提取JSON部分
        const jsonMatch = data.answer.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          analysisResults = JSON.parse(jsonMatch[1]);
        } else if (data.metadata?.extracted_results) {
          // 备选：从metadata中获取结果
          analysisResults = data.metadata.extracted_results;
        } else {
          // 如果没有结构化数据，记录原始响应
          logger.warn('未找到结构化分析结果', { answer: data.answer });
        }
      }
    } catch (error) {
      logger.error('解析Dify响应时出错', { error });
    }

    // 按三重一大分类分组结果
    const groupedResults: GroupedResults = {
      majorDecisions: analysisResults.filter(r => r.eventCategory === '重大决策'),
      personnelAppointments: analysisResults.filter(r => r.eventCategory === '重要干部任免'),
      majorProjects: analysisResults.filter(r => r.eventCategory === '重大项目'),
      largeAmounts: analysisResults.filter(r => r.eventCategory === '大额资金')
    };
    
    logger.info('完成文件分析，已分组结果', { 
      resultCount: analysisResults.length,
      groupCounts: {
        majorDecisions: groupedResults.majorDecisions.length,
        personnelAppointments: groupedResults.personnelAppointments.length,
        majorProjects: groupedResults.majorProjects.length,
        largeAmounts: groupedResults.largeAmounts.length
      }
    });

    return groupedResults;
  } catch (error) {
    logger.error('分析文件时发生错误', { error });
    throw new Error(`分析文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从数据库加载已有的分析结果
 */
export async function loadAnalysisResults(fileIds: string[]): Promise<GroupedResults> {
  try {
    const user = await getUser();
    if (!user) {
      logger.error('未授权访问');
      throw new Error('未授权访问');
    }

    if (fileIds.length === 0) {
      return {
        majorDecisions: [],
        personnelAppointments: [],
        majorProjects: [],
        largeAmounts: []
      };
    }

    logger.info('加载已有分析结果', { fileIds });
    
    // 这里应该实现从数据库加载已有分析结果的逻辑
    // 当前返回空结果，待实现真实数据库查询
    return {
      majorDecisions: [],
      personnelAppointments: [],
      majorProjects: [],
      largeAmounts: []
    };
  } catch (error) {
    logger.error('加载分析结果时发生错误', { error });
    throw new Error(`加载分析结果失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
