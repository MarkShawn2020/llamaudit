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
 * 上传文件到项目的默认知识库
 * 
 * 此端点会：
 * 1. 查找项目的默认知识库
 * 2. 如果不存在则自动创建
 * 3. 将文件上传到 Dify 知识库
 * 4. 保存文件记录到数据库
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
    const indexingTechnique = formData.get('indexingTechnique') as string || 'high_quality';
    
    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }
    
    logger.info('准备上传文件到项目知识库', {
      filename: file.name,
      size: file.size,
      projectId,
      userId: user.id
    });

    // 获取或创建项目的默认知识库
    const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
    let knowledgeBase;

    try {
      // 首先查找项目的默认知识库
      const existingKnowledgeBases = await withConnection(async (db) => {
        return await db
          .select()
          .from(knowledgeBases)
          .where(eq(knowledgeBases.auditUnitId, projectId))
          .limit(1);
      });

      if (existingKnowledgeBases.length > 0) {
        knowledgeBase = existingKnowledgeBases[0];
        logger.info('使用现有知识库', { knowledgeBaseId: knowledgeBase.id });
      } else if (datasetApiKey) {
        // 如果有数据集API密钥，创建新知识库
        const { auditUnits } = await import('@/lib/db/schema');
        const project = await withConnection(async (db) => {
          const [proj] = await db
            .select()
            .from(auditUnits)
            .where(eq(auditUnits.id, projectId))
            .limit(1);
          return proj;
        });

        if (!project) {
          return NextResponse.json({ error: '项目不存在' }, { status: 404 });
        }

        // 使用数据集API密钥创建知识库
        const { KnowledgeBaseApi } = await import('@/lib/api/knowledge-base-api');
        const kbApi = new KnowledgeBaseApi();
        
        knowledgeBase = await kbApi.createKnowledgeBase(projectId, {
          name: `${project.name} - 项目知识库`,
          description: `${project.name}项目的文档知识库，包含所有上传的项目文档`,
          indexingTechnique: 'high_quality',
          permission: 'only_me',
          createdBy: user.id
        });
        
        logger.info('创建新知识库成功', { knowledgeBaseId: knowledgeBase.id });
      } else {
        // 没有数据集API密钥，回退到普通上传
        return await handleFallbackUpload();
      }
    } catch (kbError) {
      logger.error('知识库处理失败', { error: kbError });
      return await handleFallbackUpload();
    }

    // 上传文件到知识库
    if (knowledgeBase && datasetApiKey) {
      try {
        const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/document/create_by_file`;
        
        const difyFormData = new FormData();
        difyFormData.append('file', file);
        difyFormData.append('indexing_technique', indexingTechnique);
        difyFormData.append('process_rule', JSON.stringify({
          mode: 'automatic'
        }));

        logger.info('上传文件到Dify知识库', {
          datasetId: knowledgeBase.difyDatasetId,
          filename: file.name
        });

        const difyResponse = await fetch(difyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${datasetApiKey}`,
          },
          body: difyFormData
        });

        if (!difyResponse.ok) {
          const errorText = await difyResponse.text();
          logger.error('Dify知识库API返回错误', {
            status: difyResponse.status,
            error: errorText
          });
          return await handleFallbackUpload();
        }

        const responseData = await difyResponse.json();
        logger.info('文件上传到知识库成功', {
          documentId: responseData.document?.id,
          filename: file.name
        });

        // 保存文件记录到数据库，关联知识库
        const newFile = await withConnection(async (db) => {
          const [fileRecord] = await db.insert(files).values({
            auditUnitId: projectId,
            knowledgeBaseId: knowledgeBase.id,
            difyDocumentId: responseData.document?.id,
            originalName: file.name,
            fileSize: file.size,
            fileType: file.type,
            filePath: '', // Dify存储，无本地路径
            uploadDate: new Date().toISOString(),
            userId: user.id,
            indexingStatus: 'pending'
          }).returning();
          return fileRecord;
        });

        return NextResponse.json({
          id: newFile.id,
          name: file.name,
          size: file.size,
          type: file.type,
          isKnowledgeBaseDocument: true,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
          projectId: projectId,
          document: responseData.document
        });
      } catch (uploadError) {
        logger.error('上传到知识库失败', { error: uploadError });
        return await handleFallbackUpload();
      }
    }

    // 回退上传函数
    async function handleFallbackUpload() {
      logger.info('回退到普通文件上传');
      
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
        throw new Error(`Dify API错误: ${difyResponse.status} - ${errorText}`);
      }

      const responseData = await difyResponse.json();
      
      try {
        const { saveDifyFileToDatabase } = await import('@/lib/actions/dify-file-actions');
        await saveDifyFileToDatabase(projectId, responseData);
      } catch (dbError) {
        logger.error('保存文件到数据库失败', { error: dbError });
      }

      return NextResponse.json({
        ...responseData,
        isKnowledgeBaseDocument: false,
        projectId: projectId,
        message: '文件已上传。如需知识库功能，请配置DIFY_DATASET_API_KEY。'
      });
    }
  } catch (error) {
    logger.error('文件上传到项目知识库失败', { error });
    
    return NextResponse.json(
      { error: '文件上传到项目知识库失败' },
      { status: 500 }
    );
  }
}