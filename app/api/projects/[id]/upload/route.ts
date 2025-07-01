import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 普通文件上传端点（不同步到知识库）
 * 
 * 此端点会：
 * 1. 将文件上传到 Dify 文件存储
 * 2. 保存文件记录到数据库（不关联知识库）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 获取Dify API密钥
    const apiKey = process.env.DIFY_API_KEY;
    if (!apiKey) {
      logger.error('未配置DIFY_API_KEY环境变量');
      return NextResponse.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    // 从请求中获取FormData
    const formData = await request.formData();
    
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }
    
    logger.info('准备上传文件（普通上传）', {
      filename: file.name,
      size: file.size,
      projectId,
      userId: user.id
    });

    // 上传文件到Dify
    const difyFormData = new FormData();
    difyFormData.append('file', file);
    difyFormData.append('user', projectId);

    const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/files/upload`;
    const difyResponse = await fetch(difyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: difyFormData
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      logger.error('Dify API返回错误', {
        status: difyResponse.status,
        error: errorText
      });
      return NextResponse.json(
        { error: `文件上传失败: ${difyResponse.status}` },
        { status: 500 }
      );
    }

    const responseData = await difyResponse.json();
    logger.info('文件上传成功', {
      fileId: responseData.id,
      filename: file.name
    });
    
    // 保存文件记录到数据库（不关联知识库）
    try {
      const { saveDifyFileToDatabase } = await import('@/lib/actions/dify-file-actions');
      await saveDifyFileToDatabase(projectId, responseData);
    } catch (dbError) {
      logger.error('保存文件到数据库失败', { error: dbError });
      // 即使保存到数据库失败，也返回成功，因为文件已经上传到Dify
    }

    return NextResponse.json({
      ...responseData,
      isKnowledgeBaseDocument: false,
      projectId: projectId,
      message: '文件上传成功'
    });
  } catch (error) {
    logger.error('文件上传失败', { error });
    
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
}