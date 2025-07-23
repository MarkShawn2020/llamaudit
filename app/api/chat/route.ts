/**
 * 智能助手聊天API路由 - 服务端安全代理
 * 将客户端请求代理到OpenRouter/DeepSeek API，保护API密钥
 */

import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterMessage } from '@/components/knowledge-assistant/types';

// 服务端API配置
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

interface ChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { model, messages, temperature = 0.7, maxTokens = 1500, stream = false } = body;

    // 验证请求
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '消息数组不能为空' },
        { status: 400 }
      );
    }

    // 根据模型选择API
    if (model === 'deepseek-chat') {
      return await handleDeepSeekRequest(messages, temperature, maxTokens, stream);
    } else {
      return await handleOpenRouterRequest(model, messages, temperature, maxTokens, stream);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理DeepSeek API请求
 */
async function handleDeepSeekRequest(
  messages: OpenRouterMessage[],
  temperature: number,
  maxTokens: number,
  stream: boolean
) {
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: 'DeepSeek API 密钥未配置' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false, // 暂时不支持流式
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 转换为统一格式
    return NextResponse.json({
      id: data.id || 'deepseek-' + Date.now(),
      object: 'chat.completion',
      created: data.created || Math.floor(Date.now() / 1000),
      model: 'deepseek-chat',
      choices: data.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    });
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'DeepSeek API 请求失败' },
      { status: 500 }
    );
  }
}

/**
 * 处理OpenRouter API请求
 */
async function handleOpenRouterRequest(
  model: string,
  messages: OpenRouterMessage[],
  temperature: number,
  maxTokens: number,
  stream: boolean
) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'OpenRouter API 密钥未配置' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Knowledge Assistant',
      },
      body: JSON.stringify({
        model: model.includes('/') ? model : `anthropic/${model}`,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false, // 暂时不支持流式
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OpenRouter API 请求失败' },
      { status: 500 }
    );
  }
}

// 支持CORS（如果需要）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}