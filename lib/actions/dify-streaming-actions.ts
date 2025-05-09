"use server";

import { logger } from "@/lib/logger";
import { getUser } from "@/lib/db/queries";

// Dify API配置
const DIFY_API_URL = process.env.DIFY_API_URL || "http://localhost/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// Dify SSE消息结构（客户端使用）
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

/**
 * 发送文件分析请求到API路由
 * 
 * 此服务端函数仅负责启动分析任务，不处理流式响应
 * 客户端需要连接到API路由获取实时流式结果
 * @param fileIds 文件ID列表
 * @returns 表示成功启动的布尔值
 */
export async function streamAnalyzeDifyFiles(fileIds: string[]): Promise<boolean> {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      logger.error("未授权访问");
      throw new Error("未授权访问");
    }

    if (fileIds.length === 0) {
      logger.warn("没有提供文件ID");
      return false;
    }

    logger.info("请求开始流式分析文件", {
      user: user.id,
      fileCount: fileIds.length,
    });

    // 在这里我们不直接调用Dify API，而是由客户端连接API路由
    // 所以这个函数只负责验证参数和记录请求
    
    return true;
  } catch (error) {
    logger.error("启动流式分析请求时出错", { error });
    throw error;
  }
}

/**
 * 取消Dify流式分析
 * @param taskId 任务ID
 * @returns 是否成功取消
 */
export async function cancelDifyAnalysis(taskId: string): Promise<boolean> {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      logger.error("未授权访问");
      throw new Error("未授权访问");
    }

    if (!taskId) {
      logger.warn("没有提供任务ID");
      return false;
    }

    logger.info("请求取消Dify分析任务", { taskId });

    // 我们不再直接调用Dify API，而是由客户端使用API路由
    // 服务端函数只负责验证和记录
    return true;
  } catch (error) {
    logger.error("取消分析请求时出错", { error });
    return false;
  }
}
