import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { withConnection } from '@/lib/db';
import { files } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 获取项目文件
    const projectFiles = await withConnection(async (db) => {
      return await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.auditUnitId, projectId),
            eq(files.userId, user.id)
          )
        )
        .orderBy(files.uploadDate);
    });

    return NextResponse.json(projectFiles);
  } catch (error) {
    console.error('获取项目文件失败:', error);
    return NextResponse.json(
      { error: '获取项目文件失败' },
      { status: 500 }
    );
  }
}