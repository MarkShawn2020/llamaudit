/**
 * 意图检测 API 路由
 * 分析用户问题是否需要知识库检索
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectUserIntentUniversal } from '@/lib/universal-streaming-api';

export async function POST(request: NextRequest) {
  try {
    const { question, conversationContext = '', projectId } = await request.json();

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

    console.log('🎯 开始意图检测:', { question: question.substring(0, 100), projectId });

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    try {
      const startTime = Date.now();
      
      const intentResult = await detectUserIntentUniversal(
        question,
        conversationContext,
        controller.signal
      );

      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      console.log('✅ 意图检测完成:', { ...intentResult, duration: `${duration}ms` });

      return NextResponse.json({
        success: true,
        intent: intentResult,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          projectId
        }
      });

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }

  } catch (error) {
    console.error('❌ 意图检测API错误:', error);
    
    const errorMessage = error instanceof Error ? error.message : '意图检测失败';
    
    // 检查是否是取消或超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: '意图检测超时',
          fallback: {
            isKnowledgeBaseRelated: true, // 默认认为需要知识库
            confidence: 0.5,
            reasoning: '检测超时，默认使用知识库检索'
          }
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        fallback: {
          isKnowledgeBaseRelated: true, // 出错时默认使用知识库
          confidence: 0.3,
          reasoning: '检测失败，默认使用知识库检索确保准确性'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * 获取意图检测配置信息（可选的 GET 端点）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: '项目ID不能为空' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    service: 'intent-detection',
    version: '1.0.0',
    features: [
      'LLM-based intent analysis',
      'Conversation context awareness',
      'Fallback keyword detection',
      'Confidence scoring'
    ],
    supportedModels: ['deepseek/deepseek-chat'],
    timeout: 15000,
    projectId
  });
}