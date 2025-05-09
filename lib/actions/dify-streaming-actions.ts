"use server";

import { logger } from "@/lib/logger";
import { getUser } from "@/lib/db/queries";

// Dify API配置
const DIFY_API_URL = process.env.DIFY_API_URL || "http://localhost/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// SSE事件类型
export type SSEEventType =
  | "message"
  | "error"
  | "start"
  | "end"
  | "done"
  | "meta"
  | "ping"
  | "provider_response";

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
 * 发送文件分析请求到Dify API (流式模式)
 *
 * 使用Dify的chat-messages接口分析上传的文件，并通过SSE流式返回结果
 * @param fileIds 文件ID列表
 * @param onProgress 流式响应进度回调
 * @returns 返回任务ID，可用于后续操作（如取消请求）
 */
export async function streamAnalyzeDifyFiles(
  fileIds: string[],
  onProgress: StreamProgressCallback
): Promise<string> {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      logger.error("未授权访问");
      throw new Error("未授权访问");
    }

    if (!DIFY_API_KEY) {
      logger.error("缺少Dify API密钥");
      throw new Error("系统配置错误: 缺少Dify API Key");
    }

    if (fileIds.length === 0) {
      logger.warn("没有提供文件ID");
      onProgress({ event: "error", message: "没有提供文件ID" });
      return "";
    }

    logger.info("开始通过Dify流式分析文件", {
      user,
      fileCount: fileIds.length,
      fileIds,
    });

    // 构建请求体
    const requestBody = {
      query:
        "请分析这些文件中的'三重一大'内容（重大决策、重要干部任免、重大项目、大额资金）并提取详细信息",
      inputs: {
        // json, markdown
        outputMode: "json",
      },
      user: user.id,
      response_mode: "streaming", // 使用流式模式，支持SSE
      conversation_id: "", // 使用固定会话ID以便追踪上下文
      files: fileIds.map((id) => ({
        // 'TXT', 'MD', 'MARKDOWN', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'EML', 'MSG', 'PPTX', 'PPT', 'XML', 'EPUB'
        type:"custom", // todo: 
        // local
        transfer_method: "local_file",
        upload_file_id: id,
      })),
    };

    const headers =  {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIFY_API_KEY}`,
      // Accept: "text/event-stream",
    }

    logger.info("构建请求体", {
      headers,
      requestBody,
    });

    // 发送流式请求到Dify API
    // 注意：Node.js中处理SSE需要特殊处理
    const controller = new AbortController();
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Dify API返回错误", {
        status: response.status,
        error: errorText,
      });
      onProgress({
        event: "error",
        status: response.status.toString(),
        message: errorText,
      });
      throw new Error(`Dify API错误: ${response.status} - ${errorText}`);
    }

    // 处理SSE流
    if (!response.body) {
      const error = "无法获取响应流";
      logger.error(error);
      onProgress({ event: "error", message: error });
      throw new Error(error);
    }

    // 获取任务ID并返回，用于可能的取消操作
    let taskId = "";

    // 创建Reader处理响应流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // 在后台处理流式响应
    (async () => {
      try {
        let buffer = "";
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;

          if (done) {
            onProgress({ event: "done" });
            break;
          }

          // 解码值并添加到缓冲区
          buffer += decoder.decode(value, { stream: true });

          // 处理缓冲区中的SSE消息
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 保留最后一行（可能不完整）

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (!line.startsWith("data:")) continue;
            const data = line.substring(5).trim();

            try {
              // 提取SSE消息数据
              if (data === "") continue;
              if (data === "[DONE]") {
                onProgress({ event: "done" });
                continue;
              }

              const message = JSON.parse(data) as DifySSEMessage;
              // 记录任务ID
              if (message.task_id && !taskId) {
                taskId = message.task_id;
              }

              // 发送进度更新
              onProgress(message);
            } catch (error) {
              logger.error("解析SSE消息时出错", { error, data: JSON.parse(data) });
              continue;
            }
          }
        }

        logger.info("完成Dify流式分析", { taskId });
      } catch (error) {
        logger.error("处理Dify流时出错", { error });
        onProgress({
          event: "error",
          message: `流处理错误: ${
            error instanceof Error ? error.message : "未知错误"
          }`,
        });
      }
    })();

    return taskId;
  } catch (error) {
    logger.error("启动流式分析时出错", { error });
    onProgress({
      event: "error",
      message: `启动分析失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`,
    });
    throw error;
  }
}

/**
 * 取消Dify流式分析
 * @param taskId 任务ID
 */
export async function cancelDifyAnalysis(taskId: string): Promise<boolean> {
  try {
    if (!taskId) {
      logger.warn("取消分析时未提供任务ID");
      return false;
    }

    if (!DIFY_API_KEY) {
      logger.error("缺少Dify API密钥");
      throw new Error("系统配置错误: 缺少Dify API Key");
    }

    logger.info("取消Dify分析任务", { taskId });

    const response = await fetch(`${DIFY_API_URL}/stop-generating/${taskId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIFY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("取消分析任务时出错", {
        status: response.status,
        error: errorText,
        taskId,
      });
      return false;
    }

    logger.info("成功取消分析任务", { taskId });
    return true;
  } catch (error) {
    logger.error("取消分析任务时出错", { error, taskId });
    return false;
  }
}
