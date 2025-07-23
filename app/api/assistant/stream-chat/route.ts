/**
 * 流式对话 API 路由
 * 支持直接对话和基于知识库上下文的增强对话
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamUniversalResponse, StreamingMessage } from '@/lib/universal-streaming-api';

export async function POST(request: NextRequest) {
  try {
    const { 
      question, 
      conversationHistory = [], 
      knowledgeContext = null,
      projectId,
      options = {}
    } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '问题内容不能为空' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    console.log('💬 开始流式对话:', { 
      question: question.substring(0, 100),
      hasKnowledgeContext: !!knowledgeContext,
      historyLength: conversationHistory.length,
      projectId
    });

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // 构建消息数组
          const messages: StreamingMessage[] = [
            {
              role: 'system',
              content: buildSystemPrompt(knowledgeContext, projectId)
            },
            // 添加对话历史
            ...conversationHistory.map((msg: any) => ({
              role: msg.role,
              content: msg.content
            })),
            // 添加当前用户问题
            {
              role: 'user',
              content: question
            }
          ];

          console.log('📝 构建的消息数组:', { 
            systemPromptLength: messages[0].content.length,
            totalMessages: messages.length 
          });

          // 开始流式响应
          let fullResponse = '';
          let chunkCount = 0;

          for await (const chunk of streamUniversalResponse(messages, {
            model: options.model || 'deepseek-chat', // 通用模型名，自动映射
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 2000,
            // 不指定provider，让系统自动选择最佳提供商
          })) {
            chunkCount++;

            if (chunk.error) {
              console.error('流式响应错误:', chunk.error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: chunk.error,
                chunkCount
              })}\\n\\n`));
              break;
            }

            if (chunk.isComplete) {
              console.log('✅ 流式响应完成:', { 
                totalChunks: chunkCount,
                responseLength: fullResponse.length 
              });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                totalChunks: chunkCount,
                responseLength: fullResponse.length
              })}\\n\\n`));
              
              controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
              break;
            }

            if (chunk.content) {
              fullResponse += chunk.content;
              
              // 发送数据块
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: chunk.content,
                chunkCount
              })}\\n\\n`));
            }
          }

        } catch (error) {
          console.error('❌ 流式响应处理错误:', error);
          
          const errorMessage = error instanceof Error ? error.message : '流式响应处理失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: errorMessage
          })}\\n\\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ 流式对话API错误:', error);
    
    const errorMessage = error instanceof Error ? error.message : '流式对话处理失败';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(knowledgeContext: any, projectId: string): string {
  const basePrompt = `你是一个专业的智能助手，专门帮助用户解答与当前项目相关的问题。

项目信息：
- 项目ID: ${projectId}
- 项目类型: 代码安全审查和分析系统
- 主要功能: 文档分析、代码审查、安全检测、智能问答

回答规范：
1. 准确性：基于提供的信息给出准确答案
2. 完整性：回答要全面，包含必要的上下文信息
3. 实用性：提供具体的操作步骤或建议
4. 专业性：使用专业术语，但保持易懂
5. 友好性：语气友好，乐于助人`;

  if (knowledgeContext && knowledgeContext.records && knowledgeContext.records.length > 0) {
    // 有知识库上下文的情况
    const contextContent = knowledgeContext.records
      .map((record: any, index: number) => {
        const segment = record.segment;
        return `[文档${index + 1}] ${segment.document?.name || '未知文档'}
内容: ${segment.content}
相关性评分: ${record.score.toFixed(4)}`;
      })
      .join('\\n\\n');

    return `${basePrompt}

知识库检索结果：
${contextContent}

请基于以上检索到的知识库内容来回答用户的问题。如果检索结果不足以完全回答问题，请明确说明并提供你能给出的部分答案。`;

  } else {
    // 没有知识库上下文的情况
    return `${basePrompt}

注意：当前问题被判定为不需要查询特定的项目知识库，请基于你的通用知识来回答用户的问题。如果问题确实涉及项目的具体信息，请建议用户重新描述问题以便更好地检索相关信息。`;
  }
}

/**
 * OPTIONS 方法处理 CORS 预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}