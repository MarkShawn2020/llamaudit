/**
 * AI SDK 聊天 API 路由 - 使用 Vercel AI SDK + Dify 知识库检索
 * 基于 Vercel AI SDK RAG 最佳实践重构的智能助手聊天接口
 */

import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { retrieveKnowledge, formatKnowledgeContext } from '@/lib/ai/knowledge-retrieval';

// 创建 DeepSeek OpenAI 兼容客户端
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 允许流式响应最多 30 秒
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { messages, projectId } = await request.json();

    // 验证必需参数
    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: '消息数组不能为空' },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== 'string') {
      return Response.json(
        { error: '项目ID不能为空' },
        { status: 400 }
      );
    }

    console.log('🤖 AI SDK 聊天开始:', {
      messagesCount: messages.length,
      projectId,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    // 使用 AI SDK 的 streamText 进行流式响应
    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: buildSystemPrompt(projectId),
      messages: convertToCoreMessages(messages),
      tools: {
        // 知识库检索工具
        retrieveKnowledge: tool({
          description: `从项目知识库中检索相关信息来回答用户问题。
            当用户询问与项目相关的具体信息、文档内容、规则、流程等时，使用此工具。`,
          parameters: z.object({
            query: z.string().describe('用户的问题或查询关键词'),
            searchMethod: z.enum(['keyword_search', 'semantic_search', 'full_text_search', 'hybrid_search'])
              .default('hybrid_search')
              .describe('检索方法，默认使用混合检索'),
            topK: z.number().min(1).max(10).default(5)
              .describe('返回结果数量，1-10之间'),
          }),
          execute: async ({ query, searchMethod, topK }) => {
            console.log('🔍 执行知识库检索工具:', { query, searchMethod, topK, projectId });
            
            const retrievalResult = await retrieveKnowledge({
              query,
              projectId,
              searchMethod,
              topK,
              scoreThreshold: 0.3
            });

            if (!retrievalResult.success) {
              return `检索失败: ${retrievalResult.error}`;
            }

            const formattedContext = formatKnowledgeContext(retrievalResult);
            
            console.log('✅ 知识库检索工具执行完成:', {
              recordsFound: retrievalResult.data?.records?.length || 0
            });

            return formattedContext;
          }
        }),

        // 项目信息工具（基础信息）
        getProjectInfo: tool({
          description: '获取当前项目的基本信息和可用功能说明',
          parameters: z.object({}),
          execute: async () => {
            return `当前项目信息：
            
项目ID: ${projectId}
项目类型: 智能审查分析系统
主要功能:
- 文档上传和解析
- 智能内容分析和提取
- 合规性检查
- 知识库问答
- 数据可视化和报表生成

可用操作:
- 上传各类文档（PDF、Word、Excel等）
- 查询文档内容和分析结果
- 进行合规性审查
- 导出分析报告

如需查询具体的项目文档或分析结果，请告诉我您想了解的内容，我会从知识库中为您检索相关信息。`;
          }
        })
      },
      maxSteps: 3, // 允许多步工具调用
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('❌ AI SDK 聊天API错误:', error);
    
    const errorMessage = error instanceof Error ? error.message : '聊天处理失败';
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(projectId: string): string {
  return `你是一个专业的智能审查助手，专门帮助用户使用智能审查分析系统。

项目信息：
- 项目ID: ${projectId}
- 系统类型: 智能审查分析系统
- 主要功能: 文档分析、内容提取、合规检查、智能问答

工作原则：
1. **准确性优先**: 基于知识库和工具调用的结果给出准确答案
2. **主动检索**: 当用户询问具体信息时，主动使用知识库检索工具
3. **清晰说明**: 明确区分来自知识库的信息和一般性建议
4. **专业友好**: 保持专业但友好的语调，提供实用的操作建议

回答指导：
- 对于项目相关的具体问题，优先使用 retrieveKnowledge 工具检索相关信息
- 对于一般性询问，可以使用 getProjectInfo 工具提供基础信息
- 如果知识库中没有相关信息，请明确说明并提供可能的建议
- 始终提供具体可行的操作步骤或建议

请根据用户的问题，合理使用可用工具来提供最佳的帮助。`;
}

/**
 * OPTIONS 方法处理 CORS 预检请求
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}