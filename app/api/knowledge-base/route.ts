import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';

// GET - 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const auditUnitId = searchParams.get('auditUnitId');

    if (!auditUnitId) {
      return NextResponse.json({ error: '缺少 auditUnitId 参数' }, { status: 400 });
    }

    const knowledgeBases = await knowledgeBaseApi.getKnowledgeBasesByAuditUnit(auditUnitId);
    
    return NextResponse.json({ data: knowledgeBases });
  } catch (error) {
    console.error('Error getting knowledge bases:', error);
    return NextResponse.json(
      { error: '获取知识库列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建知识库
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { auditUnitId, name, description, indexingTechnique, permission } = body;

    if (!auditUnitId || !name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const knowledgeBase = await knowledgeBaseApi.createKnowledgeBase(auditUnitId, {
      name,
      description,
      indexingTechnique,
      permission,
      createdBy: user.id
    });

    return NextResponse.json({ data: knowledgeBase }, { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '创建知识库失败' 
      },
      { status: 500 }
    );
  }
}