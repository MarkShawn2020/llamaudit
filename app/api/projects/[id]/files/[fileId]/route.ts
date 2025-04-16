import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { auditUnits, files } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { join } from 'path';
import { unlink } from 'fs/promises';

// 删除文件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const auditUnitId = params.id;
    const fileId = params.fileId;
    
    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, auditUnitId),
    });

    if (!auditUnit) {
      return NextResponse.json(
        { error: '被审计单位不存在' },
        { status: 404 }
      );
    }

    // 获取文件信息
    const fileInfo = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, auditUnitId)
      ),
    });

    if (!fileInfo) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 删除数据库记录
    await db.delete(files).where(
      and(
        eq(files.id, fileId),
        eq(files.auditUnitId, auditUnitId)
      )
    );

    // 尝试删除文件系统中的文件
    try {
      // 先获取文件路径
      const filePath = fileInfo.filePath;
      if (filePath && filePath.startsWith('/uploads/')) {
        const relativePath = filePath.substring(1); // 移除前导斜杠
        const fullPath = join(process.cwd(), 'public', relativePath);
        await unlink(fullPath);
      }
    } catch (fileError) {
      // 文件删除失败不影响整体流程，只记录日志
      console.error('物理文件删除失败:', fileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
}

// 更新文件信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const auditUnitId = params.id;
    const fileId = params.fileId;
    
    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, auditUnitId),
    });

    if (!auditUnit) {
      return NextResponse.json(
        { error: '被审计单位不存在' },
        { status: 404 }
      );
    }

    // 获取文件信息
    const fileInfo = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, auditUnitId)
      ),
    });

    if (!fileInfo) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 获取请求体
    const body = await request.json();
    
    // 更新文件分析状态
    if (body.isAnalyzed !== undefined) {
      await db.update(files)
        .set({ isAnalyzed: body.isAnalyzed })
        .where(
          and(
            eq(files.id, fileId),
            eq(files.auditUnitId, auditUnitId)
          )
        );
    }

    // 获取更新后的文件
    const updatedFile = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, auditUnitId)
      ),
      with: {
        uploadedBy: {
          columns: {
            name: true,
          }
        }
      }
    });

    if (!updatedFile) {
      return NextResponse.json(
        { error: '文件更新失败' },
        { status: 500 }
      );
    }

    // 格式化响应
    const formattedFile = {
      id: updatedFile.id,
      filename: updatedFile.originalName,
      size: Number(updatedFile.fileSize),
      type: updatedFile.fileType,
      url: updatedFile.filePath,
      createdAt: updatedFile.uploadDate?.toISOString() || new Date().toISOString(),
      uploadedBy: updatedFile.uploadedBy?.name || '未知用户',
      isAnalyzed: updatedFile.isAnalyzed
    };

    return NextResponse.json(formattedFile);
  } catch (error) {
    console.error('更新文件失败:', error);
    return NextResponse.json(
      { error: '更新文件失败' },
      { status: 500 }
    );
  }
} 