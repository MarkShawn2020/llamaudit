import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { auditUnits } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取所有项目（被审计单位）
    const projects = await db.query.auditUnits.findMany({
      orderBy: (auditUnits, { desc }) => [desc(auditUnits.createdAt)],
      with: {
        createdByUser: {
          columns: {
            name: true,
          }
        },
        files: true
      }
    });

    // 格式化响应
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      address: project.address || '',
      contact: project.contactPerson || '',
      phone: project.phone || '',
      email: project.email || '',
      description: project.description || '',
      createdAt: project.createdAt?.toISOString().split('T')[0] || '',
      updatedAt: project.updatedAt?.toISOString().split('T')[0] || '',
      documentCount: project.files?.length || 0,
      taskCount: 0, // 后续可从任务表中计算
      status: 'active' as const
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // 检查必填字段
    if (!data.name || !data.code || !data.type) {
      return NextResponse.json(
        { error: '缺少必要的项目信息' },
        { status: 400 }
      );
    }

    // 检查项目代码是否已存在
    const existingProject = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.code, data.code)
    });

    if (existingProject) {
      return NextResponse.json(
        { error: '项目代码已存在' },
        { status: 400 }
      );
    }

    // 创建新项目，处理字段名称差异
    const newProject = await db.insert(auditUnits).values({
      name: data.name,
      code: data.code,
      type: data.type,
      address: data.address || '',
      contactPerson: data.contact || '', // 接收前端的 contact 字段
      phone: data.phone || '',
      email: data.email || '',
      description: data.description || '',
      createdBy: user.id
    }).returning();

    if (!newProject[0]) {
      throw new Error('创建项目失败');
    }

    // 格式化响应，保持与前端一致的命名
    const createdProject = {
      id: newProject[0].id,
      name: newProject[0].name,
      code: newProject[0].code,
      type: newProject[0].type,
      address: newProject[0].address || '',
      contact: newProject[0].contactPerson || '', // 返回给前端时使用 contact
      phone: newProject[0].phone || '',
      email: newProject[0].email || '',
      description: newProject[0].description || '',
      createdAt: newProject[0].createdAt?.toISOString().split('T')[0] || '',
      updatedAt: newProject[0].updatedAt?.toISOString().split('T')[0] || '',
      documentCount: 0,
      taskCount: 0,
      status: 'active' as const
    };

    return NextResponse.json(createdProject);
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    );
  }
} 