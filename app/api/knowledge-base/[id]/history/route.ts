import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - 获取问答历史
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const history = await knowledgeBaseApi.getQaHistory(id, limit, offset);
    
    return NextResponse.json({ data: history });
  } catch (error) {
    console.error('Error getting QA history:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取问答历史失败' 
      },
      { status: 500 }
    );
  }
}