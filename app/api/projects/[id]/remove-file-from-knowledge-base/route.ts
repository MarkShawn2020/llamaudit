import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';
import { withConnection } from '@/lib/db';
import { files, knowledgeBases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 从知识库中移除文件
 * 
 * 此端点会：
 * 1. 查找文件记录和关联的知识库
 * 2. 从 Dify 知识库中删除文档
 * 3. 更新文件记录，取消知识库关联
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户身份
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: '未提供文件ID' }, { status: 400 });
    }

    // 获取Dify API密钥
    const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
    if (!datasetApiKey) {
      logger.error('未配置DIFY_DATASET_API_KEY环境变量');
      return NextResponse.json(
        { error: '数据集API密钥未配置' },
        { status: 500 }
      );
    }

    logger.info('准备从知识库移除文件', {
      fileId,
      projectId,
      userId: user.id
    });

    // 获取文件信息和关联的知识库
    const fileWithKnowledge = await withConnection(async (db) => {
      const result = await db
        .select({
          file: files,
          knowledgeBase: knowledgeBases
        })
        .from(files)
        .leftJoin(knowledgeBases, eq(files.knowledgeBaseId, knowledgeBases.id))
        .where(eq(files.id, fileId))
        .limit(1);
      
      return result[0];
    });

    if (!fileWithKnowledge) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const { file: fileRecord, knowledgeBase } = fileWithKnowledge;

    if (fileRecord.auditUnitId !== projectId) {
      return NextResponse.json({ error: '文件不属于此项目' }, { status: 403 });
    }

    // 如果文件没有关联到知识库，直接返回成功
    if (!fileRecord.knowledgeBaseId || !knowledgeBase) {
      return NextResponse.json({
        success: true,
        message: '文件未在知识库中',
        fileId: fileRecord.id
      });
    }

    // 从Dify知识库中删除文档
    if (fileRecord.difyDocumentId) {
      try {
        const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/documents/${fileRecord.difyDocumentId}`;
        
        logger.info('从Dify知识库删除文档', {
          datasetId: knowledgeBase.difyDatasetId,
          documentId: fileRecord.difyDocumentId,
          filename: fileRecord.originalName
        });

        const difyResponse = await fetch(difyUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${datasetApiKey}`,
          }
        });

        if (!difyResponse.ok) {
          const errorText = await difyResponse.text();
          logger.error('Dify知识库删除API返回错误', {
            status: difyResponse.status,
            error: errorText
          });
          
          // 如果是404错误，说明文档已经不存在了，继续处理
          if (difyResponse.status !== 404) {
            throw new Error(`Dify API错误: ${difyResponse.status}`);
          }
        }

        logger.info('文档从知识库删除成功', {
          documentId: fileRecord.difyDocumentId,
          filename: fileRecord.originalName
        });
      } catch (deleteError) {
        logger.error('从知识库删除文档失败', { error: deleteError });
        return NextResponse.json(
          { error: '从知识库删除文档失败' },
          { status: 500 }
        );
      }
    }

    // 更新文件记录，取消知识库关联
    await withConnection(async (db) => {
      await db
        .update(files)
        .set({
          knowledgeBaseId: null,
          difyDocumentId: null,
          indexingStatus: null
        })
        .where(eq(files.id, fileId));
    });

    return NextResponse.json({
      success: true,
      message: '文件已从知识库中移除',
      fileId: fileRecord.id,
      knowledgeBaseId: knowledgeBase.id,
      knowledgeBaseName: knowledgeBase.name
    });
  } catch (error) {
    logger.error('从知识库移除文件失败', { error });
    
    return NextResponse.json(
      { error: '从知识库移除文件失败' },
      { status: 500 }
    );
  }
}