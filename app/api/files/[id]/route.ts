import { db } from '@/lib/db';
import { getUser } from '@/lib/db/queries';
import { files } from '@/lib/db/schema';
import { createStorage } from '@/lib/file-storage';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// 创建存储提供程序
const storage = createStorage();

/**
 * 获取单个文件信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 身份验证
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const fileId = params.id;

    // 从数据库获取文件元数据
    const fileMetadata = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!fileMetadata) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 验证文件所有权（或权限）
    if (fileMetadata.userId !== user.id) {
      // 这里可以添加更复杂的权限检查，例如团队访问权限
      return NextResponse.json({ error: '无权访问此文件' }, { status: 403 });
    }

    // 返回文件信息
    return NextResponse.json({
      id: fileMetadata.id,
      name: fileMetadata.name,
      type: fileMetadata.fileType,
      size: fileMetadata.size,
      url: fileMetadata.url,
      createdAt: fileMetadata.createdAt,
      updatedAt: fileMetadata.updatedAt,
    });
  } catch (error) {
    console.error('获取文件信息错误:', error);
    return NextResponse.json(
      { error: '获取文件信息失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除文件
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 身份验证
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const fileId = params.id;

    // 从数据库获取文件元数据
    const fileMetadata = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!fileMetadata) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // 验证文件所有权（或权限）
    if (fileMetadata.userId !== user.id) {
      // 这里可以添加更复杂的权限检查，例如团队访问权限
      return NextResponse.json({ error: '无权删除此文件' }, { status: 403 });
    }

    // 从存储中删除文件
    await storage.deleteFile(fileMetadata.id, fileMetadata.storagePath);

    // 从数据库中删除文件记录
    await db.delete(files).where(eq(files.id, fileId));

    // 重新验证文件路径
    revalidatePath('/files');

    // 返回成功响应
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文件错误:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
} 