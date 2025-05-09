                                      import { logger } from "@/lib/logger";
import { getUser } from "@/lib/db/queries";
import { NextRequest } from "next/server";

// Dify API配置
const NEXT_PUBLIC_DIFY_API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || "http://localhost/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

/**
 * 流式分析API路由
 * 从Dify获取流式响应并转发给客户端
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      logger.error("未授权访问流式分析API");
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 从 URL 查询参数中获取 fileIds
    const searchParams = request.nextUrl.searchParams;
    const fileIdsParam = searchParams.get('fileIds');
    
    if (!fileIdsParam) {
      logger.error("缺少fileIds查询参数", { user });
      return new Response(JSON.stringify({ error: "缺少文件ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    let fileIds: string[];
    try {
      fileIds = JSON.parse(fileIdsParam);
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        throw new Error('无效的fileIds格式');
      }
    } catch (error) {
      logger.error("解析fileIds参数出错", { error, fileIdsParam });
      return new Response(JSON.stringify({ error: "无效的文件ID格式" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    if (!DIFY_API_KEY) {
      logger.error("缺少Dify API密钥", { user });
      return new Response(JSON.stringify({ error: "系统配置错误: 缺少Dify API Key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 构建请求体
    const requestBody = {
      query:
        "请分析这些文件中的'三重一大'内容（重大决策、重要干部任免、重大项目、大额资金）并提取详细信息",
      inputs: {
        outputMode: "json",
      },
      user: user.id,
      response_mode: "streaming", // 使用流式模式，支持SSE
      conversation_id: "", // 使用固定会话ID以便追踪上下文
      files: fileIds.map((id: string) => ({
        type: "document",
        transfer_method: "local_file",
        upload_file_id: id,
      })),
    };
    
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIFY_API_KEY}`,
    };
    
    logger.info("API路由: 准备发送Dify分析请求", requestBody);
    
    // 创建一个新的TransformStream来处理Dify响应
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    // 创建响应对象（SSE）
    const response = new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
    // 异步处理Dify请求
    (async () => {
      try {
        // 发送任务开始消息
        writer.write(encoder.encode(`data: ${JSON.stringify({ 
          event: "start"
        })}\n\n`));
        
        // 发送流式请求到Dify API
        const difyResponse = await fetch(`${NEXT_PUBLIC_DIFY_API_URL}/chat-messages`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
    
        if (!difyResponse.ok) {
          const errorText = await difyResponse.text();
          logger.error("Dify API返回错误", {
            status: difyResponse.status,
            error: errorText,
          });
          
          writer.write(encoder.encode(`data: ${JSON.stringify({ 
            event: "error",
            message: `Dify API错误: ${difyResponse.status}`,
            details: errorText 
          })}\n\n`));
          writer.close();
          return;
        }
        
        // 确保响应流存在
        if (!difyResponse.body) {
          writer.write(encoder.encode(`data: ${JSON.stringify({ 
            event: "error",
            message: "无法获取Dify响应流"
          })}\n\n`));
          writer.close();
          return;
        }
    
        // 处理Dify响应流并转发给客户端
        const reader = difyResponse.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = "";
        let done = false;
        let taskId = "";
                
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (done) {
            writer.write(encoder.encode(`data: ${JSON.stringify({ 
              event: "done",
              task_id: taskId 
            })}\n\n`));
            break;
          }
          
          // 解码并添加到缓冲区
          buffer += decoder.decode(value, { stream: true });
          
          // 处理SSE消息
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 保留最后一行（可能不完整）
          
          for (const line of lines) {
            if (line.trim() === "") continue;
            if (!line.startsWith("data:")) continue;
            
            const data = line.substring(5).trim();
            logger.info("收到Dify原始消息", { data: data.substring(0, 100) + (data.length > 100 ? '...' : '') });
            
            try {
              // 处理特殊情况
              if (data === "") continue;
              if (data === "[DONE]") {
                writer.write(encoder.encode(`data: ${JSON.stringify({ 
                  event: "done",
                  task_id: taskId 
                })}\n\n`));
                continue;
              }
              
              // 直接转发Dify的原始消息，不做额外处理
              // Dify的流式响应格式已经是SSE标准格式: "data: {...}\n\n"
              writer.write(encoder.encode(`${line}\n\n`));
              
              // 从Dify响应中提取task_id，用于处理取消请求
              try {
                const parsedData = JSON.parse(data);
                if (parsedData.task_id && !taskId) {
                  taskId = parsedData.task_id;
                  logger.info("获取到Dify任务ID", { taskId });
                }
              } catch (parseError) {
                // 忽略解析错误，不影响消息转发
                logger.warn("解析任务ID出错", { parseError });
              }
            } catch (error) {
              logger.error("处理SSE消息时出错", { error, line });
              continue;
            }
          }
        }
        
        // 最后确保writer关闭
        writer.close();
        logger.info("完成Dify流式分析转发", { taskId });
      } catch (error) {
        logger.error("处理Dify流时出错", { error });
        writer.write(encoder.encode(`data: ${JSON.stringify({ 
          event: "error",
          message: error instanceof Error ? error.message : "处理流时出错"
        })}\n\n`));
        writer.close();
      }
    })();
    
    return response;
  } catch (error) {
    logger.error("流式分析API发生错误", { error });
    return new Response(JSON.stringify({ 
      error: "服务器内部错误",
      details: error instanceof Error ? error.message : "未知错误" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * 取消分析API调用
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户
    const user = await getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 解析任务ID
    const { taskId } = await request.json();
    
    if (!taskId) {
      return new Response(JSON.stringify({ error: "缺少taskId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 取消Dify分析
    if (!DIFY_API_KEY) {
      return new Response(JSON.stringify({ error: "系统配置错误: 缺少Dify API Key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 发送取消请求到Dify
    const response = await fetch(`${NEXT_PUBLIC_DIFY_API_URL}/chat-messages/stop-generating`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({ task_id: taskId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error("取消Dify分析时出错", { 
        taskId,
        status: response.status,
        error: errorText 
      });
      
      return new Response(JSON.stringify({ 
        success: false,
        error: `取消分析失败: ${response.status}`,
        details: errorText 
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    logger.info("成功取消Dify分析", { taskId });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("取消分析API发生错误", { error });
    return new Response(JSON.stringify({ 
      success: false,
      error: "服务器内部错误",
      details: error instanceof Error ? error.message : "未知错误" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
