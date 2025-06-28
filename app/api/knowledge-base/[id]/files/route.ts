import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - 获取知识库中的文件
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const files = await knowledgeBaseApi.getKnowledgeBaseFiles(params.id);
    
    return NextResponse.json({ data: files });
  } catch (error) {
    console.error('Error getting knowledge base files:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取知识库文件失败' 
      },
      { status: 500 }
    );
  }
}