import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';
import { withConnection } from '@/lib/db';
import { files, knowledgeBases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 将文件上传到知识库
 * 
 * 此端点接收文件并将其添加到指定的 Dify 知识库中
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

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
    const knowledgeBaseId = formData.get('knowledgeBaseId') as string | null;
    const indexingTechnique = formData.get('indexingTechnique') as string || 'high_quality';
    
    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }
    
    if (!knowledgeBaseId) {
      return NextResponse.json({ error: '未提供知识库ID' }, { status: 400 });
    }
    
    logger.info('准备上传文件到知识库', {
      filename: file.name,
      size: file.size,
      knowledgeBaseId,
      userId: user.id
    });

    // 获取知识库信息
    const knowledgeBase = await withConnection(async (db) => {
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, knowledgeBaseId))
        .limit(1);
      return kb;
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: '知识库不存在' }, { status: 404 });
    }

    // 创建FormData发送到Dify
    const difyFormData = new FormData();
    difyFormData.append('file', file);
    
    // 设置文档处理规则
    const processRule = {
      mode: 'automatic', // 使用自动模式
      rules: {
        pre_processing_rules: [
          { id: 'remove_extra_spaces', enabled: true },
          { id: 'remove_urls_emails', enabled: true }
        ],
        segmentation: {
          separator: '\\n',
          max_tokens: 1000
        }
      }
    };

    difyFormData.append('data', JSON.stringify({
      indexing_technique: indexingTechnique,
      process_rule: processRule
    }));

    // 调用 Dify API 创建文档
    const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/v1/datasets/${knowledgeBase.difyDatasetId}/document/create_by_file`;
    
    logger.info('调用Dify API创建文档', {
      url: difyUrl,
      datasetId: knowledgeBase.difyDatasetId
    });

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
        { error: `Dify API错误: ${difyResponse.status} - ${errorText}` },
        { status: difyResponse.status }
      );
    }

    const responseData = await difyResponse.json();
    logger.info('文档创建成功', {
      documentId: responseData.document.id,
      filename: responseData.document.name,
      status: responseData.document.indexing_status
    });
    
    // 将文件信息保存到数据库
    try {
      await withConnection(async (db) => {
        const [savedFile] = await db.insert(files).values({
          name: responseData.document.name,
          originalName: file.name,
          filePath: '', // Dify管理文件路径
          fileSize: file.size,
          fileType: file.type,
          userId: user.id,
          auditUnitId: knowledgeBase.auditUnitId,
          knowledgeBaseId: knowledgeBase.id,
          difyDocumentId: responseData.document.id,
          indexingStatus: responseData.document.indexing_status,
          isAnalyzed: false,
          storageProvider: 'dify',
          metadata: JSON.stringify(responseData.document)
        }).returning();

        logger.info('文件信息已保存到数据库', {
          fileId: savedFile.id,
          difyDocumentId: responseData.document.id
        });
      });
    } catch (dbError) {
      logger.error('保存文件到数据库失败', {
        error: dbError,
        documentId: responseData.document.id
      });
      // 继续返回成功，因为文件已经上传到Dify
    }
    
    return NextResponse.json({
      success: true,
      data: {
        document: responseData.document,
        batch: responseData.batch
      }
    });
  } catch (error) {
    logger.error('文件上传到知识库失败', { error });
    
    return NextResponse.json(
      { error: '文件上传到知识库失败' },
      { status: 500 }
    );
  }
}