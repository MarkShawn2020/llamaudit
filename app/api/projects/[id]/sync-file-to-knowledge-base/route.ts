import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';
import {auditUnits, withConnection} from '@/lib/db';
import { files, knowledgeBases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 将已上传的文件同步到知识库
 * 
 * 此端点会：
 * 1. 查找项目的默认知识库
 * 2. 如果不存在则自动创建
 * 3. 将文件同步到 Dify 知识库
 * 4. 更新文件记录的知识库关联
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

    logger.info('准备同步文件到知识库', {
      fileId,
      projectId,
      userId: user.id
    });

    // 获取文件信息
    const fileRecord = await withConnection(async (db) => {
      const [file] = await db
        .select()
        .from(files)
        .where(eq(files.id, fileId))
        .limit(1);
      return file;
    });

    if (!fileRecord) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (fileRecord.auditUnitId !== projectId) {
      return NextResponse.json({ error: '文件不属于此项目' }, { status: 403 });
    }

    // 如果文件已经关联到知识库，直接返回成功
    if (fileRecord.knowledgeBaseId) {
      return NextResponse.json({
        success: true,
        message: '文件已经在知识库中',
        fileId: fileRecord.id,
        knowledgeBaseId: fileRecord.knowledgeBaseId
      });
    }

    // 获取或创建项目的默认知识库
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
      } else {
        // 创建新知识库
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
      }
    } catch (kbError) {
      logger.error('知识库处理失败', { error: kbError });
      return NextResponse.json(
        { error: '知识库处理失败' },
        { status: 500 }
      );
    }

    // 处理 Dify 存储的文件
    try {
      // 检查是否是存储在 Dify 的文件
      const metadata = fileRecord.metadata ? JSON.parse(fileRecord.metadata) : {};
      
      if (metadata.storageProvider === 'dify' && metadata.difyFileId) {
        logger.info('使用已上传的文件创建知识库文档', {
          difyFileId: metadata.difyFileId,
          datasetId: knowledgeBase.difyDatasetId,
          filename: fileRecord.originalName
        });

        // 对于 Dify 存储的文件，使用文本方式创建知识库文档，并引用已上传的文件
        const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/document/create_by_text`;
        
        const response = await fetch(difyUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${datasetApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fileRecord.originalName,
            text: `文件引用: ${fileRecord.originalName}`,
            indexing_technique: 'high_quality',
            process_rule: {
              mode: 'automatic'
            },
            upload_file_id: metadata.difyFileId  // 引用已上传的文件
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('使用文件ID创建知识库文档失败', {
            status: response.status,
            error: errorText
          });
          throw new Error(`使用已上传文件创建知识库文档失败: ${response.status}`);
        }

        const responseData = await response.json();
        logger.info('使用文件ID创建知识库文档成功', {
          documentId: responseData.document?.id,
          filename: fileRecord.originalName
        });

        // 更新文件记录，关联知识库
        await withConnection(async (db) => {
          await db
            .update(files)
            .set({
              knowledgeBaseId: knowledgeBase.id,
              difyDocumentId: responseData.document?.id,
              indexingStatus: 'pending'
            })
            .where(eq(files.id, fileId));
        });

        return NextResponse.json({
          success: true,
          message: '文件已成功同步到知识库',
          fileId: fileRecord.id,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
          document: responseData.document
        });
      } else if (fileRecord.filePath && !fileRecord.filePath.startsWith('/api/')) {
        // 处理本地存储的文件
        const fs = await import('fs');
        const path = await import('path');
        
        const filePath = path.join(process.cwd(), 'uploads', fileRecord.filePath);
        const fileBuffer = fs.readFileSync(filePath);
        const file = new File([fileBuffer], fileRecord.originalName, {
          type: fileRecord.fileType
        });

        // 上传文件到Dify知识库，使用正确的格式
        const difyUrl = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/document/create_by_file`;
        
        const difyFormData = new FormData();
        difyFormData.append('file', file);
        
        // 根据文档，data 字段需要设置正确的 Content-Type
        const dataBlob = new Blob([JSON.stringify({
          indexing_technique: 'high_quality',
          process_rule: {
            mode: 'automatic'
          }
        })], { type: 'text/plain' });
        
        difyFormData.append('data', dataBlob);

        logger.info('上传本地文件到Dify知识库', {
          datasetId: knowledgeBase.difyDatasetId,
          filename: fileRecord.originalName
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
          throw new Error(`Dify API错误: ${difyResponse.status}`);
        }

        const responseData = await difyResponse.json();
        logger.info('本地文件同步到知识库成功', {
          documentId: responseData.document?.id,
          filename: fileRecord.originalName
        });

        // 更新文件记录，关联知识库
        await withConnection(async (db) => {
          await db
            .update(files)
            .set({
              knowledgeBaseId: knowledgeBase.id,
              difyDocumentId: responseData.document?.id,
              indexingStatus: 'pending'
            })
            .where(eq(files.id, fileId));
        });

        return NextResponse.json({
          success: true,
          message: '文件已成功同步到知识库',
          fileId: fileRecord.id,
          knowledgeBaseId: knowledgeBase.id,
          knowledgeBaseName: knowledgeBase.name,
          document: responseData.document
        });
      } else {
        throw new Error('无法处理此类型的文件：文件路径格式不支持');
      }
    } catch (syncError) {
      logger.error('同步文件到知识库失败', { error: syncError });
      return NextResponse.json(
        { error: '同步文件到知识库失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('同步文件到知识库失败', { error });
    
    return NextResponse.json(
      { error: '同步文件到知识库失败' },
      { status: 500 }
    );
  }
}
