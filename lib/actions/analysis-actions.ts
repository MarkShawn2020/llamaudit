'use server';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { analysisResults, files, auditUnits } from '@/lib/db/schema';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';



export interface AnalysisResponse {
  success: boolean;
  message?: string;
  result?: any;
}

/**
 * 获取项目的所有分析结果
 */
export async function getProjectAnalysisResults(auditUnitId: string) {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, auditUnitId),
    });

    if (!auditUnit) {
      throw new Error('被审计单位不存在');
    }

    // 获取已分析过的文件
    const analyzedFiles = await db.query.files.findMany({
      where: and(
        eq(files.auditUnitId, auditUnitId),
        eq(files.isAnalyzed, true)
      ),
      orderBy: (files, { desc }) => [desc(files.uploadDate)]
    });

    const fileIds = analyzedFiles.map(file => file.id);
    
    if (fileIds.length === 0) {
      return [];
    }

    // 获取分析结果
    const results = await db.query.analysisResults.findMany({
      where: inArray(analysisResults.fileId, fileIds),
      orderBy: [
        desc(analysisResults.createdAt)
      ]
    });

    // 按文件分组结果
    const resultsByFile = fileIds.map(fileId => {
      const file = analyzedFiles.find(f => f.id === fileId);
      const fileResults = results.filter(r => r.fileId === fileId);
      
      return {
        ...file,
        analysisResults: fileResults
      };
    }).filter(f => f.analysisResults.length > 0);

    return resultsByFile;
  } catch (error) {
    console.error('获取项目分析结果失败:', error);
    throw error;
  }
}

/**
 * 保存分析结果
 */
export async function saveAnalysisResults(
  auditUnitId: string,
  results: typeof analysisResults.$inferInsert[]
): Promise<AnalysisResponse> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 保存分析结果
    const savedResults = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      // 检查文件是否存在且属于该项目
      const fileExists = await db.query.files.findFirst({
        where: and(
          eq(files.id, result.fileId),
          eq(files.auditUnitId, auditUnitId)
        ),
      });

      if (!fileExists) {
        throw new Error(`文件ID为${result.fileId}的文件不存在或不属于该项目`);
      }

      // 转换金额数据
      let amountInvolved;
      if (result.amountInvolved) {
        // 移除货币符号和逗号，并转为数字
        const numStr = String(result.amountInvolved).replace(/[¥,\s]/g, '');
        if (/^\d+(\.\d+)?$/.test(numStr)) {
          amountInvolved = parseFloat(numStr);
        }
      }

      // 保存到数据库
      const savedResult = await db.insert(analysisResults).values({
        fileId: result.fileId,
        itemIndex: i,
        meetingTime: result.meetingTime,
        meetingNumber: result.meetingNumber,
        meetingTopic: result.meetingTopic,
        meetingConclusion: result.meetingConclusion,
        contentSummary: result.contentSummary,
        eventCategory: result.eventCategory,
        eventDetails: result.eventDetails,
        amountInvolved: amountInvolved as any, // 类型转换
        relatedDepartments: result.relatedDepartments,
        relatedPersonnel: result.relatedPersonnel,
        decisionBasis: result.decisionBasis,
        originalText: result.originalText,
        status: 'completed',
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      savedResults.push(savedResult[0]);
      
      // 更新文件分析状态
      await db.update(files)
        .set({ isAnalyzed: true })
        .where(eq(files.id, result.fileId));
    }

    // 刷新页面缓存
    revalidatePath(`/projects/${auditUnitId}`);

    return {
      success: true,
      message: `成功保存${savedResults.length}条分析结果`,
      result: savedResults
    };
  } catch (error) {
    console.error('保存分析结果失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存分析结果失败'
    };
  }
} 