'use server';

import { db } from '@/lib/db/drizzle';
import { auditUnits, files } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

export interface FileResponse {
  id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  uploadedBy?: string;
  isAnalyzed: boolean;
}

/**
 * 获取项目文件列表
 */
export async function getProjectFiles(projectId: string): Promise<FileResponse[]> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
    });

    if (!auditUnit) {
      throw new Error('被审计单位不存在');
    }
    
    // 获取被审计单位的文件
    const filesList = await db.query.files.findMany({
      where: eq(files.auditUnitId, projectId),
      orderBy: (files, { desc }) => [desc(files.uploadDate)],
      with: {
        uploadedBy: {
          columns: {
            name: true,
          }
        }
      }
    });

    // 格式化响应
    return filesList.map(file => ({
      id: file.id,
      filename: file.originalName,
      size: Number(file.fileSize),
      type: file.fileType,
      url: file.filePath,
      createdAt: file.uploadDate?.toISOString() || new Date().toISOString(),
      uploadedBy: file.uploadedBy?.name || '未知用户',
      isAnalyzed: !!file.isAnalyzed
    }));
  } catch (error) {
    console.error('获取文件列表失败:', error);
    throw error;
  }
}

/**
 * 上传文件到项目
 */
export async function uploadProjectFiles(
  formData: FormData
): Promise<{files: FileResponse[]}> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    const projectId = formData.get('projectId') as string;
    if (!projectId) {
      throw new Error('项目ID不能为空');
    }

    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
    });

    if (!auditUnit) {
      throw new Error('被审计单位不存在');
    }

    const uploadedFiles = formData.getAll('files') as File[];
    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error('没有上传文件');
    }

    // 准备上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', projectId);
    
    // 确保目录存在
    await mkdir(uploadDir, { recursive: true });
    
    const savedFiles: FileResponse[] = [];
    
    for (const file of uploadedFiles) {
      const fileId = randomUUID();
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${fileId}.${fileExt}`;
      const filePath = join(uploadDir, fileName);
      
      // 保存文件到本地（实际生产环境应该使用云存储）
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      
      // 文件相对路径（用于访问）
      const publicPath = `/uploads/${projectId}/${fileName}`;
      
      // 创建文件记录 (移除id字段，让数据库自动生成)
      const newFile = await db.insert(files).values({
        name: fileName,
        originalName: file.name,
        filePath: publicPath,
        fileSize: Number(file.size), // 将BigInt转换为Number
        fileType: file.type,
        uploadDate: new Date(),
        userId: user.id,
        auditUnitId: projectId,
        isAnalyzed: false
      }).returning();
      
      if (newFile[0]) {
        savedFiles.push({
          id: newFile[0].id,
          filename: newFile[0].originalName,
          size: Number(newFile[0].fileSize),
          type: newFile[0].fileType,
          url: newFile[0].filePath,
          createdAt: newFile[0].uploadDate?.toISOString() || new Date().toISOString(),
          isAnalyzed: false
        });
      }
    }
    
    // 刷新项目页面的缓存
    revalidatePath(`/projects/${projectId}`);
    
    return { files: savedFiles };
  } catch (error) {
    console.error('上传文件失败:', error);
    throw error;
  }
}

/**
 * 删除项目文件
 */
export async function deleteProjectFile(
  projectId: string, 
  fileId: string
): Promise<{ success: boolean }> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
    });

    if (!auditUnit) {
      throw new Error('被审计单位不存在');
    }

    // 获取文件信息
    const fileInfo = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, projectId)
      ),
    });

    if (!fileInfo) {
      throw new Error('文件不存在');
    }

    // 删除数据库记录
    await db.delete(files).where(
      and(
        eq(files.id, fileId),
        eq(files.auditUnitId, projectId)
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

    // 刷新项目页面的缓存
    revalidatePath(`/projects/${projectId}`);
    
    return { success: true };
  } catch (error) {
    console.error('删除文件失败:', error);
    throw error;
  }
}

/**
 * 更新文件分析状态
 */
export async function updateFileAnalysisStatus(
  projectId: string, 
  fileId: string, 
  isAnalyzed: boolean
): Promise<FileResponse> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
    });

    if (!auditUnit) {
      throw new Error('被审计单位不存在');
    }

    // 获取文件信息
    const fileInfo = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, projectId)
      ),
    });

    if (!fileInfo) {
      throw new Error('文件不存在');
    }

    // 更新文件分析状态
    await db.update(files)
      .set({ isAnalyzed })
      .where(
        and(
          eq(files.id, fileId),
          eq(files.auditUnitId, projectId)
        )
      );

    // 获取更新后的文件
    const updatedFile = await db.query.files.findFirst({
      where: and(
        eq(files.id, fileId),
        eq(files.auditUnitId, projectId)
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
      throw new Error('文件更新失败');
    }

    // 刷新项目页面的缓存
    revalidatePath(`/projects/${projectId}`);

    // 格式化响应
    return {
      id: updatedFile.id,
      filename: updatedFile.originalName,
      size: Number(updatedFile.fileSize),
      type: updatedFile.fileType,
      url: updatedFile.filePath,
      createdAt: updatedFile.uploadDate?.toISOString() || new Date().toISOString(),
      uploadedBy: updatedFile.uploadedBy?.name || '未知用户',
      isAnalyzed: !!updatedFile.isAnalyzed
    };
  } catch (error) {
    console.error('更新文件失败:', error);
    throw error;
  }
} 