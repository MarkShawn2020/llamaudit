import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { withConnection, type DB } from '../../../lib/db';
import { getUser } from '../../../lib/db/queries';
import { files } from '../../../lib/db/schema';
import { createStorage } from '../../../lib/file-storage';

// 创建存储提供程序
const storage = createStorage();

/**
 * 处理文件上传请求
 */
export async function POST(request: NextRequest) {
  try {
    // 身份验证
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }

    // 处理文件大小限制（10MB）
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `文件大小超过限制 (${MAX_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // 文件类型验证
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 生成唯一的文件ID
    const fileId = randomUUID();
    
    // 上传文件到存储
    const uploadResult = await storage.uploadFile(file, fileId);

    // 使用 withConnection 包装数据库操作
    const fileMetadata = await withConnection(async (db: DB) => {
      const [result] = await db
        .insert(files)
        .values({
          id: fileId,
          name: file.name,
          originalName: file.name,
          size: file.size,
          fileType: file.type,
          url: uploadResult.url,
          storagePath: uploadResult.path,
          storageProvider: uploadResult.provider,
          userId: user.id,
        })
        .returning();
      return result;
    });

    // 重新验证文件路径
    revalidatePath('/files');

    // 返回文件信息
    return NextResponse.json({
      id: fileMetadata.id,
      name: fileMetadata.name,
      type: fileMetadata.fileType,
      size: fileMetadata.size,
      url: fileMetadata.url,
      createdAt: fileMetadata.createdAt,
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
} 