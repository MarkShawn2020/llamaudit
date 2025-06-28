import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST - 知识库问答
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { question, topK, scoreThreshold } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: '问题不能为空' }, { status: 400 });
    }

    const result = await knowledgeBaseApi.queryKnowledgeBase(
      params.id,
      question,
      user.id,
      {
        topK: topK || 5,
        scoreThreshold: scoreThreshold || 0.5
      }
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '知识库问答失败' 
      },
      { status: 500 }
    );
  }
}