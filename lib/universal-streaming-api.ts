/**
 * 通用流式 API 服务
 * 支持多个AI提供商（OpenRouter、DeepSeek等）
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
  provider?: 'openrouter' | 'deepseek';
}

/**
 * 模型名映射配置
 * 不同提供商使用不同的模型命名规范
 */
const MODEL_MAPPINGS = {
  openrouter: {
    'deepseek-chat': 'deepseek/deepseek-r1:free',
    'deepseek-r1': 'deepseek/deepseek-r1:free',
    'deepseek-coder': 'deepseek/deepseek-r1:free',
    'claude-3-haiku': 'anthropic/claude-3-haiku',
    'claude-3-sonnet': 'anthropic/claude-3.5-sonnet',
    'gpt-4': 'openai/gpt-4',
    'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  },
  deepseek: {
    'deepseek/deepseek-r1:free': 'deepseek-chat',
    'deepseek-r1': 'deepseek-chat', 
    'deepseek-coder': 'deepseek-coder',
    'deepseek-chat': 'deepseek-chat',
  }
} as const;

/**
 * 根据提供商映射模型名
 */
function mapModelName(model: string, provider: 'openrouter' | 'deepseek'): string {
  const mapping = MODEL_MAPPINGS[provider];
  const mappedModel = mapping[model as keyof typeof mapping] || model;
  
  if (mappedModel !== model) {
    console.log(`🔄 模型名映射: ${model} → ${mappedModel} (${provider})`);
  }
  
  return mappedModel;
}

/**
 * 获取推荐的模型配置
 */
export function getRecommendedModels() {
  return {
    conversation: {
      deepseek: 'deepseek-chat',
      openrouter: 'deepseek-chat', // 会被映射为 deepseek/deepseek-r1:free
    },
    coding: {
      deepseek: 'deepseek-coder',
      openrouter: 'deepseek-coder', // 会被映射为 deepseek/deepseek-r1:free
    },
    reasoning: {
      deepseek: 'deepseek-chat',
      openrouter: 'deepseek-r1', // 会被映射为 deepseek/deepseek-r1:free
    }
  };
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  error?: string;
}

/**
 * DeepSeek API 流式调用
 */
async function* streamDeepSeekResponse(
  messages: StreamingMessage[],
  options: StreamingOptions = {}
): AsyncGenerator<StreamChunk, void, unknown> {
  const {
    model = 'deepseek-chat',
    temperature = 0.7,
    maxTokens = 2000,
    abortSignal
  } = options;

  // 映射模型名到DeepSeek API格式
  const mappedModel = mapModelName(model, 'deepseek');

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 环境变量未设置');
  }

  console.log('🚀 开始DeepSeek流式调用:', { 
    originalModel: model, 
    mappedModel, 
    messagesCount: messages.length 
  });

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mappedModel,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: abortSignal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      console.error('DeepSeek API错误:', { status: response.status, errorData });
      throw new Error(`DeepSeek API错误: ${errorData.error || response.statusText}`);
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

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
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
              if (!data.startsWith(':')) {
                console.warn('解析DeepSeek SSE数据失败:', data);
              }
            }
          }
        }
      }

      yield { content: '', isComplete: true };
    } finally {
      reader.cancel();
    }

  } catch (error) {
    console.error('DeepSeek 流式调用错误:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      yield { content: '', isComplete: true, error: '请求已取消' };
    } else {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      yield { content: '', isComplete: true, error: errorMessage };
    }
  }
}

/**
 * OpenRouter API 流式调用（原有逻辑）
 */
async function* streamOpenRouterResponse(
  messages: StreamingMessage[],
  options: StreamingOptions = {}
): AsyncGenerator<StreamChunk, void, unknown> {
  const {
    model = 'deepseek-chat', // 使用通用名，将被映射到OpenRouter格式
    temperature = 0.7,
    maxTokens = 2000,
    abortSignal
  } = options;

  // 映射模型名到OpenRouter API格式
  const mappedModel = mapModelName(model, 'openrouter');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY 环境变量未设置');
  }

  console.log('🚀 开始OpenRouter流式调用:', { 
    originalModel: model, 
    mappedModel, 
    messagesCount: messages.length 
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'LlamaAudit Assistant'
      },
      body: JSON.stringify({
        model: mappedModel,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: abortSignal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      console.error('OpenRouter API错误:', { status: response.status, errorData });
      throw new Error(`OpenRouter API错误: ${JSON.stringify(errorData)}`);
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

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const lineEnd = buffer.indexOf('\n');
          if (lineEnd === -1) break;

          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
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
              if (!data.startsWith(': OPENROUTER')) {
                console.warn('解析OpenRouter SSE数据失败:', data);
              }
            }
          }
        }
      }

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
 * 通用流式响应函数 - 自动选择可用的提供商
 */
export async function* streamUniversalResponse(
  messages: StreamingMessage[],
  options: StreamingOptions = {}
): AsyncGenerator<StreamChunk, void, unknown> {
  const { provider } = options;

  // 如果指定了提供商，直接使用
  if (provider === 'deepseek') {
    yield* streamDeepSeekResponse(messages, options);
    return;
  }
  
  if (provider === 'openrouter') {
    yield* streamOpenRouterResponse(messages, options);
    return;
  }

  // 自动选择可用的提供商
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;

  console.log('🔍 检查可用的AI提供商:', { hasOpenRouter, hasDeepSeek });

  if (hasDeepSeek) {
    console.log('✅ 使用 DeepSeek API');
    yield* streamDeepSeekResponse(messages, {
      ...options,
      model: options.model || 'deepseek-chat' // 使用传入的模型或默认值
    });
  } else if (hasOpenRouter) {
    console.log('✅ 使用 OpenRouter API');
    yield* streamOpenRouterResponse(messages, {
      ...options,
      model: options.model || 'deepseek-chat' // 将被映射为 deepseek/deepseek-r1:free
    });
  } else {
    throw new Error('没有可用的AI API密钥，请设置 DEEPSEEK_API_KEY 或 OPENROUTER_API_KEY');
  }
}

/**
 * 意图检测专用的流式调用
 */
export async function detectUserIntentUniversal(
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

IMPORTANT: 请只返回纯JSON格式，不要使用markdown代码块或其他包装：
{"isKnowledgeBaseRelated": true/false, "confidence": 0-1之间的数值, "reasoning": "判断理由"}

${conversationContext ? `对话上下文：${conversationContext}` : ''}

用户问题：${userQuestion}

回答（纯JSON格式）：`;

  const messages: StreamingMessage[] = [
    { role: 'system', content: intentPrompt },
    { role: 'user', content: userQuestion }
  ];

  let fullResponse = '';
  
  try {
    for await (const chunk of streamUniversalResponse(messages, {
      model: 'deepseek-chat', // 通用模型名，会根据实际提供商自动映射
      temperature: 0.1,
      maxTokens: 200,
      abortSignal,
      provider: 'deepseek' // 优先使用 DeepSeek 进行意图检测
    })) {
      if (chunk.error) {
        throw new Error(chunk.error);
      }
      
      if (!chunk.isComplete) {
        fullResponse += chunk.content;
      }
    }

    // 智能解析 JSON 响应（支持多种格式）
    try {
      const intentResult = parseSmartJSON(fullResponse);
      return {
        isKnowledgeBaseRelated: Boolean(intentResult.isKnowledgeBaseRelated),
        confidence: Math.max(0, Math.min(1, Number(intentResult.confidence) || 0.5)),
        reasoning: String(intentResult.reasoning || '无法确定')
      };
    } catch (parseError) {
      console.error('意图检测响应解析失败:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        fullResponse: fullResponse.substring(0, 500),
        responseLength: fullResponse.length
      });
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
 * 智能JSON解析器 - 支持多种格式
 * 处理纯JSON、markdown包装、混合文本等格式
 */
function parseSmartJSON(response: string): any {
  const trimmedResponse = response.trim();
  
  console.log('🔍 开始智能JSON解析:', {
    responseLength: trimmedResponse.length,
    startsWithBrace: trimmedResponse.startsWith('{'),
    includesCodeBlock: trimmedResponse.includes('```'),
    preview: trimmedResponse.substring(0, 100) + (trimmedResponse.length > 100 ? '...' : '')
  });

  // 策略1: 尝试直接解析（纯JSON格式）
  if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
    try {
      console.log('📋 尝试策略1: 直接JSON解析');
      const result = JSON.parse(trimmedResponse);
      console.log('✅ 策略1成功');
      return result;
    } catch (error) {
      console.log('❌ 策略1失败:', error instanceof Error ? error.message : String(error));
    }
  }

  // 策略2: 提取markdown代码块中的JSON
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/i;
  const match = trimmedResponse.match(codeBlockRegex);
  
  if (match && match[1]) {
    try {
      console.log('📋 尝试策略2: markdown代码块提取');
      const extractedJSON = match[1].trim();
      console.log('🔍 提取的JSON:', extractedJSON.substring(0, 200));
      const result = JSON.parse(extractedJSON);
      console.log('✅ 策略2成功');
      return result;
    } catch (error) {
      console.log('❌ 策略2失败:', error instanceof Error ? error.message : String(error));
    }
  }

  // 策略3: 寻找第一个完整的JSON对象
  const jsonObjectRegex = /\{[\s\S]*?\}/;
  const jsonMatch = trimmedResponse.match(jsonObjectRegex);
  
  if (jsonMatch) {
    try {
      console.log('📋 尝试策略3: 正则提取JSON对象');
      const extractedJSON = jsonMatch[0];
      console.log('🔍 正则提取的JSON:', extractedJSON.substring(0, 200));
      const result = JSON.parse(extractedJSON);
      console.log('✅ 策略3成功');
      return result;
    } catch (error) {
      console.log('❌ 策略3失败:', error instanceof Error ? error.message : String(error));
    }
  }

  // 策略4: 尝试修复常见的JSON格式问题
  try {
    console.log('📋 尝试策略4: JSON修复');
    
    // 移除多余的反引号和markdown标记
    let cleaned = trimmedResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/^\s*json\s*\n/i, '')
      .trim();

    // 寻找JSON对象的开始和结束
    const startIndex = cleaned.indexOf('{');
    const lastIndex = cleaned.lastIndexOf('}');
    
    if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
      const jsonString = cleaned.substring(startIndex, lastIndex + 1);
      console.log('🔍 修复的JSON:', jsonString.substring(0, 200));
      const result = JSON.parse(jsonString);
      console.log('✅ 策略4成功');
      return result;
    }
  } catch (error) {
    console.log('❌ 策略4失败:', error instanceof Error ? error.message : String(error));
  }

  // 策略5: 逐行分析和重构JSON
  try {
    console.log('📋 尝试策略5: 逐行重构JSON');
    
    const lines = trimmedResponse.split('\n');
    const jsonLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('```') && 
             !trimmed.match(/^(这是|以下是|根据|分析)/);
    });
    
    const reconstructed = jsonLines.join('\n').trim();
    console.log('🔍 重构的JSON:', reconstructed.substring(0, 200));
    
    const result = JSON.parse(reconstructed);
    console.log('✅ 策略5成功');
    return result;
  } catch (error) {
    console.log('❌ 策略5失败:', error instanceof Error ? error.message : String(error));
  }

  // 所有策略都失败，抛出详细错误
  throw new Error(`智能JSON解析失败 - 尝试了5种策略都无法解析响应: ${trimmedResponse.substring(0, 200)}...`);
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

export default streamUniversalResponse;