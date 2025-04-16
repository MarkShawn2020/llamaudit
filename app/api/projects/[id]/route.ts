import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { auditUnits, files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 获取单个项目详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    
    // 获取项目详情
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
      with: {
        createdByUser: {
          columns: {
            name: true,
          }
        },
        files: true
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 格式化响应，统一命名规范
    const formattedProject = {
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
      address: project.address || '',
      contact: project.contactPerson || '', // 使用 contact 字段名
      phone: project.phone || '',
      email: project.email || '',
      description: project.description || '',
      createdAt: project.createdAt?.toISOString().split('T')[0] || '',
      updatedAt: project.updatedAt?.toISOString().split('T')[0] || '',
      documentCount: project.files?.length || 0,
      taskCount: 0, // 后续可从任务表中计算
      status: 'active' as const,
      files: project.files?.map(file => ({
        id: file.id,
        filename: file.originalName,
        size: Number(file.fileSize),
        url: file.filePath,
        createdAt: file.uploadDate?.toISOString() || new Date().toISOString(),
        type: file.fileType
      }))
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return NextResponse.json(
      { error: '获取项目详情失败' },
      { status: 500 }
    );
  }
}

// 更新项目信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const data = await request.json();
    
    // 检查项目是否存在
    const existingProject = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId)
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 如果更新了code，检查是否有重复
    if (data.code && data.code !== existingProject.code) {
      const codeExists = await db.query.auditUnits.findFirst({
        where: eq(auditUnits.code, data.code)
      });

      if (codeExists) {
        return NextResponse.json(
          { error: '项目代码已存在' },
          { status: 400 }
        );
      }
    }

    // 更新项目信息，处理字段名差异
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code;
    if (data.type) updateData.type = data.type;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contact !== undefined) updateData.contactPerson = data.contact; // 接收前端的 contact 字段
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.description !== undefined) updateData.description = data.description;
    updateData.updatedAt = new Date();

    const updatedProject = await db.update(auditUnits)
      .set(updateData)
      .where(eq(auditUnits.id, projectId))
      .returning();

    if (!updatedProject[0]) {
      throw new Error('更新项目失败');
    }

    // 获取项目文件
    const projectFiles = await db.query.files.findMany({
      where: eq(files.auditUnitId, projectId)
    });

    // 格式化响应，保持与前端一致的命名
    const formattedProject = {
      id: updatedProject[0].id,
      name: updatedProject[0].name,
      code: updatedProject[0].code,
      type: updatedProject[0].type,
      address: updatedProject[0].address || '',
      contact: updatedProject[0].contactPerson || '', // 返回 contact 字段
      phone: updatedProject[0].phone || '',
      email: updatedProject[0].email || '',
      description: updatedProject[0].description || '',
      createdAt: updatedProject[0].createdAt?.toISOString().split('T')[0] || '',
      updatedAt: updatedProject[0].updatedAt?.toISOString().split('T')[0] || '',
      documentCount: projectFiles.length,
      taskCount: 0,
      status: 'active' as const
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    
    // 检查项目是否存在
    const existingProject = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId)
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 删除项目
    await db.delete(auditUnits).where(eq(auditUnits.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json(
      { error: '删除项目失败' },
      { status: 500 }
    );
  }
} 