'use server';

import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { analysisResults, analysisTasks, files } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface AnalysisResultInput {
  fileId: string;
  meetingTime?: string;
  meetingNumber?: string;
  meetingTopic?: string;
  meetingConclusion?: string;
  contentSummary?: string;
  eventCategory?: string;
  eventDetails?: string;
  amountInvolved?: string;
  relatedDepartments?: string;
  relatedPersonnel?: string;
  decisionBasis?: string;
  originalText?: string;
}

export interface AnalysisResponse {
  success: boolean;
  message?: string;
  result?: any;
}

/**
 * 创建分析任务
 */
export async function createAnalysisTask(
  auditUnitId: string,
  name: string,
  taskType: string = 'three_important_one_big'
): Promise<{ taskId: string }> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 创建分析任务
    const task = await db.insert(analysisTasks).values({
      name,
      auditUnitId,
      createdBy: user.id,
      status: 'pending',
      taskType,
      createdAt: new Date(),
    }).returning();

    if (!task.length) {
      throw new Error('创建分析任务失败');
    }

    // 刷新页面缓存
    revalidatePath(`/projects/${auditUnitId}`);

    return { taskId: task[0].id };
  } catch (error) {
    console.error('创建分析任务失败:', error);
    throw error;
  }
}

/**
 * 保存分析结果
 */
export async function saveAnalysisResults(
  auditUnitId: string,
  taskId: string,
  results: AnalysisResultInput[]
): Promise<AnalysisResponse> {
  try {
    const user = await getUser();
    if (!user) {
      throw new Error('未授权访问');
    }

    // 检查分析任务是否存在
    const task = await db.query.analysisTasks.findFirst({
      where: and(
        eq(analysisTasks.id, taskId),
        eq(analysisTasks.auditUnitId, auditUnitId)
      ),
    });

    if (!task) {
      throw new Error('分析任务不存在');
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
        const numStr = result.amountInvolved.replace(/[¥,\s]/g, '');
        if (/^\d+(\.\d+)?$/.test(numStr)) {
          amountInvolved = parseFloat(numStr);
        }
      }

      // 转换会议时间
      let meetingTime;
      if (result.meetingTime) {
        try {
          meetingTime = new Date(result.meetingTime);
        } catch (error) {
          console.warn(`无效的会议时间格式: ${result.meetingTime}`);
        }
      }

      // 保存到数据库
      const savedResult = await db.insert(analysisResults).values({
        taskId,
        fileId: result.fileId,
        itemIndex: i,
        meetingTime,
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
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      savedResults.push(savedResult[0]);
    }

    // 更新任务状态
    await db.update(analysisTasks)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(analysisTasks.id, taskId));

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