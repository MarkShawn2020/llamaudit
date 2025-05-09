'use server';

import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { files } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

/**
 * 保存Dify上传文件信息到数据库
 * 
 * 当文件通过Dify API上传后，将文件元数据保存到项目数据库，
 * 以便在系统中正常显示和使用这些文件
 */
export async function saveDifyFileToDatabase(
  auditUnitId: string,
  difyFileData: {
    id: string;
    name: string;
    size: number;
    mime_type: string;
    created_at: number;
  }
) {
  try {
    const user = await getUser();
    if (!user) {
      logger.error('未授权访问');
      throw new Error('未授权访问');
    }

    logger.info('开始保存Dify文件到数据库', {
      fileId: difyFileData.id,
      filename: difyFileData.name,
      auditUnitId
    });

    // 检查文件是否已存在(基于Dify文件ID)
    const existingFile = await db.query.files.findFirst({
      where: (files, { eq }) => eq(files.name, difyFileData.id)
    });

    if (existingFile) {
      logger.warn('文件已存在，跳过保存', {
        fileId: difyFileData.id,
        filename: difyFileData.name
      });
      
      // 返回已存在的文件记录
      return {
        id: existingFile.id,
        originalName: existingFile.originalName,
        fileSize: Number(existingFile.fileSize),
        fileType: existingFile.fileType,
        filePath: existingFile.filePath,
        uploadDate: existingFile.uploadDate?.toISOString() || new Date().toISOString(),
        userId: existingFile.userId,
        isAnalyzed: !!existingFile.isAnalyzed
      };
    }

    // 创建文件访问URL（通过我们的API代理访问Dify文件）
    const fileUrl = `/api/dify/files?id=${difyFileData.id}`;

    // 将Dify文件信息保存到数据库
    const newFile = await db.insert(files).values({
      id: difyFileData.id, // todo: general
      name: difyFileData.id, // 使用Dify文件ID作为唯一标识
      originalName: difyFileData.name,
      filePath: fileUrl, // 文件访问路径
      fileSize: difyFileData.size,
      fileType: difyFileData.mime_type,
      uploadDate: new Date(difyFileData.created_at * 1000),
      userId: user.id,
      auditUnitId: auditUnitId,
      isAnalyzed: false,
      metadata: JSON.stringify({
        storageProvider: 'dify',
        difyFileId: difyFileData.id
      })
    }).returning();

    if (!newFile[0]) {
      logger.error('保存Dify文件到数据库失败', {
        fileId: difyFileData.id,
        filename: difyFileData.name
      });
      throw new Error('保存文件记录失败');
    }

    logger.info('Dify文件成功保存到数据库', {
      dbFileId: newFile[0].id,
      difyFileId: difyFileData.id,
      filename: difyFileData.name
    });

    // 返回新创建的文件记录
    return {
      id: newFile[0].id,
      originalName: newFile[0].originalName,
      fileSize: Number(newFile[0].fileSize),
      fileType: newFile[0].fileType,
      filePath: newFile[0].filePath,
      uploadDate: newFile[0].uploadDate?.toISOString() || new Date().toISOString(),
      userId: newFile[0].userId,
      isAnalyzed: !!newFile[0].isAnalyzed
    };
  } catch (error) {
    logger.error('保存Dify文件到数据库失败', { error });
    throw error;
  }
}
