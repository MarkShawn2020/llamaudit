import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - 获取知识库详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const knowledgeBase = await knowledgeBaseApi.getKnowledgeBase(params.id);
    
    return NextResponse.json({ data: knowledgeBase });
  } catch (error) {
    console.error('Error getting knowledge base:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '获取知识库详情失败' 
      },
      { status: 500 }
    );
  }
}

// PUT - 更新知识库
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const knowledgeBase = await knowledgeBaseApi.updateKnowledgeBase(params.id, body);

    return NextResponse.json({ data: knowledgeBase });
  } catch (error) {
    console.error('Error updating knowledge base:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '更新知识库失败' 
      },
      { status: 500 }
    );
  }
}

// DELETE - 删除知识库
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    await knowledgeBaseApi.deleteKnowledgeBase(params.id);

    return NextResponse.json({ message: '知识库删除成功' });
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '删除知识库失败' 
      },
      { status: 500 }
    );
  }
}