/**
 * OpenRouter 流式 API 服务
 * 支持意图判断和对话生成的流式调用
 */

export interface StreamingMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  error?: string;
}

/**
 * 流式调用 OpenRouter API
 */
export async function* streamOpenRouterResponse(
  messages: StreamingMessage[],
  options: StreamingOptions = {}
): AsyncGenerator<StreamChunk, void, unknown> {
  const {
    model = 'deepseek/deepseek-chat',
    temperature = 0.7,
    maxTokens = 2000,
    abortSignal
  } = options;

  try {
    console.log('🚀 开始流式调用 OpenRouter API:', { model, messagesCount: messages.length });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY 环境变量未设置');
    }

    console.log('🔑 API密钥检查:', {
      hasApiKey: !!apiKey,
      keyPrefix: apiKey?.substring(0, 8) + '...',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    });

    const requestBody = {
      model,
      messages,
      stream: true,
      temperature,
      max_tokens: maxTokens,
    };

    console.log('📤 OpenRouter请求详情:', {
      model,
      messagesPreview: messages.map(m => ({ role: m.role, length: m.content.length })),
      temperature,
      max_tokens: maxTokens
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LlamaAudit Assistant'
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      console.error('OpenRouter API详细错误:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: 'https://openrouter.ai/api/v1/chat/completions'
      });
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      if (errorData && typeof errorData === 'object') {
        if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : JSON.stringify(errorData.error);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      }
      
      throw new Error(`OpenRouter API错误: ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('响应体不可读');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将新数据块添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 处理缓冲区中的完整行
        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          // 处理 SSE 数据行
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            // 检查流结束标记
            if (data === '[DONE]') {
              yield { content: '', isComplete: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                yield { content, isComplete: false };
              }
            } catch (e) {
              // 忽略无法解析的JSON（如注释行）
              if (!data.startsWith(': OPENROUTER')) {
                console.warn('解析SSE数据失败:', data);
              }
            }
          }
        }
      }

      // 如果没有收到 [DONE] 标记，手动标记完成
      yield { content: '', isComplete: true };

    } finally {
      reader.cancel();
    }

  } catch (error) {
    console.error('OpenRouter 流式调用错误:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      yield { content: '', isComplete: true, error: '请求已取消' };
    } else {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      yield { content: '', isComplete: true, error: errorMessage };
    }
  }
}

/**
 * 服务端流式 API 调用包装器
 * 用于 Next.js API routes
 */
export class StreamingOpenRouterService {
  private abortController: AbortController | null = null;

  /**
   * 开始流式响应
   */
  async *streamResponse(
    messages: StreamingMessage[],
    options: Omit<StreamingOptions, 'abortSignal'> = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // 创建新的 AbortController
    this.abortController = new AbortController();
    
    yield* streamOpenRouterResponse(messages, {
      ...options,
      abortSignal: this.abortController.signal
    });
  }

  /**
   * 取消当前流式请求
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 检查是否有活跃的请求
   */
  isActive(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}

/**
 * 意图检测专用的流式调用
 * 返回简化的判断结果
 */
export async function detectUserIntent(
  userQuestion: string,
  conversationContext: string = '',
  abortSignal?: AbortSignal
): Promise<{
  isKnowledgeBaseRelated: boolean;
  confidence: number;
  reasoning: string;
}> {
  const intentPrompt = `你是一个意图分析专家。请分析用户的问题是否需要查询知识库来获得准确答案。

知识库内容特征：
- 包含项目文档、技术规范、操作指南
- 涵盖代码审查、安全检测、文件分析相关的专业知识
- 具有具体的功能说明、API文档、配置信息

分析规则：
1. 如果问题涉及具体的技术实现、操作步骤、功能说明 → 需要知识库
2. 如果问题是通用性问题、闲聊、基础概念解释 → 不需要知识库
3. 如果问题询问"这个系统"、"当前项目"、"如何使用" → 需要知识库

请严格按照JSON格式回答：
{
  "isKnowledgeBaseRelated": true/false,
  "confidence": 0-1之间的数值,
  "reasoning": "判断理由"
}

${conversationContext ? `对话上下文：${conversationContext}` : ''}

用户问题：${userQuestion}`;

  const messages: StreamingMessage[] = [
    { role: 'system', content: intentPrompt },
    { role: 'user', content: userQuestion }
  ];

  let fullResponse = '';
  
  try {
    for await (const chunk of streamOpenRouterResponse(messages, {
      model: 'deepseek/deepseek-chat',
      temperature: 0.1, // 低温度确保稳定判断
      maxTokens: 200,   // 限制回答长度
      abortSignal
    })) {
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      
      if (!chunk.isComplete) {
        fullResponse += chunk.content;
      }
    }

    // 解析 JSON 响应
    try {
      const intentResult = JSON.parse(fullResponse.trim());
      return {
        isKnowledgeBaseRelated: Boolean(intentResult.isKnowledgeBaseRelated),
        confidence: Math.max(0, Math.min(1, Number(intentResult.confidence) || 0.5)),
        reasoning: String(intentResult.reasoning || '无法确定')
      };
    } catch (parseError) {
      console.error('意图检测响应解析失败:', fullResponse);
      // 回退到关键词检测
      return fallbackIntentDetection(userQuestion);
    }

  } catch (error) {
    console.error('意图检测失败:', error);
    // 回退到关键词检测
    return fallbackIntentDetection(userQuestion);
  }
}

/**
 * 备用意图检测（基于关键词）
 */
function fallbackIntentDetection(userQuestion: string): {
  isKnowledgeBaseRelated: boolean;
  confidence: number;
  reasoning: string;
} {
  const knowledgeKeywords = [
    '系统', '功能', '如何', '怎样', '什么是', '操作', '使用', '配置',
    '文档', '审查', '检测', '分析', '代码', '文件', '项目', '工具'
  ];

  const generalKeywords = [
    '你好', '谢谢', '再见', '天气', '时间', '新闻', '娱乐', '聊天'
  ];

  const question = userQuestion.toLowerCase();
  
  const knowledgeMatches = knowledgeKeywords.filter(keyword => 
    question.includes(keyword)
  ).length;
  
  const generalMatches = generalKeywords.filter(keyword => 
    question.includes(keyword)
  ).length;

  const isKnowledgeBaseRelated = knowledgeMatches > generalMatches;
  const confidence = Math.min(0.8, Math.max(0.3, 
    (knowledgeMatches + generalMatches) / Math.max(knowledgeKeywords.length, generalKeywords.length)
  ));

  return {
    isKnowledgeBaseRelated,
    confidence,
    reasoning: `关键词匹配分析：知识库相关(${knowledgeMatches})，通用问题(${generalMatches})`
  };
}

export default StreamingOpenRouterService;