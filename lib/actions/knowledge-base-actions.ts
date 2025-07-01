'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { knowledgeBaseApi } from '@/lib/api/knowledge-base-api';
import { getUser } from '@/lib/db/queries';

// 创建知识库的验证模式
const createKnowledgeBaseSchema = z.object({
  auditUnitId: z.string().uuid(),
  name: z.string().min(1, '知识库名称不能为空').max(255, '知识库名称过长'),
  description: z.string().optional(),
  indexingTechnique: z.enum(['high_quality', 'economy']).default('high_quality'),
  permission: z.enum(['only_me', 'all_team_members', 'partial_members']).default('only_me')
});

// 更新知识库的验证模式
const updateKnowledgeBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '知识库名称不能为空').max(255, '知识库名称过长').optional(),
  description: z.string().optional(),
  retrievalConfig: z.any().optional()
});

// 知识库问答的验证模式
const queryKnowledgeBaseSchema = z.object({
  knowledgeBaseId: z.string().uuid(),
  question: z.string().min(1, '问题不能为空').max(1000, '问题过长'),
  topK: z.number().min(1).max(20).optional(),
  scoreThreshold: z.number().min(0).max(1).optional()
});

// 创建知识库
export const createKnowledgeBase = validatedActionWithUser(
  createKnowledgeBaseSchema,
  async (data, _, user) => {
    try {
      const knowledgeBase = await knowledgeBaseApi.createKnowledgeBase(data.auditUnitId, {
        name: data.name,
        description: data.description,
        indexingTechnique: data.indexingTechnique,
        permission: data.permission,
        createdBy: user.id
      });

      revalidatePath(`/projects/${data.auditUnitId}`);
      
      return { 
        success: '知识库创建成功',
        data: knowledgeBase
      };
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      return { 
        error: error instanceof Error ? error.message : '创建知识库失败，请重试'
      };
    }
  }
);

// 获取项目的知识库列表
export async function getKnowledgeBasesByAuditUnit(auditUnitId: string) {
  try {
    const knowledgeBases = await knowledgeBaseApi.getKnowledgeBasesByAuditUnit(auditUnitId);
    return { success: true, data: knowledgeBases };
  } catch (error) {
    console.error('Failed to get knowledge bases:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取知识库列表失败'
    };
  }
}

// 获取知识库详情
export async function getKnowledgeBase(id: string) {
  try {
    const knowledgeBase = await knowledgeBaseApi.getKnowledgeBase(id);
    return { success: true, data: knowledgeBase };
  } catch (error) {
    console.error('Failed to get knowledge base:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取知识库详情失败'
    };
  }
}

// 更新知识库
export const updateKnowledgeBase = validatedActionWithUser(
  updateKnowledgeBaseSchema,
  async (data, _, user) => {
    try {
      const { id, ...updateData } = data;
      const knowledgeBase = await knowledgeBaseApi.updateKnowledgeBase(id, updateData);

      revalidatePath(`/projects`);
      
      return { 
        success: '知识库更新成功',
        data: knowledgeBase
      };
    } catch (error) {
      console.error('Failed to update knowledge base:', error);
      return { 
        error: error instanceof Error ? error.message : '更新知识库失败，请重试'
      };
    }
  }
);

// 删除知识库
export async function deleteKnowledgeBase(id: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: '用户未登录' };
    }

    await knowledgeBaseApi.deleteKnowledgeBase(id);
    
    revalidatePath('/projects');
    
    return { success: '知识库删除成功' };
  } catch (error) {
    console.error('Failed to delete knowledge base:', error);
    return { 
      error: error instanceof Error ? error.message : '删除知识库失败，请重试'
    };
  }
}

// 知识库问答
export const queryKnowledgeBase = validatedActionWithUser(
  queryKnowledgeBaseSchema,
  async (data, _, user) => {
    try {
      const result = await knowledgeBaseApi.queryKnowledgeBase(
        data.knowledgeBaseId, 
        data.question, 
        user.id,
        {
          topK: data.topK,
          scoreThreshold: data.scoreThreshold
        }
      );

      return { 
        success: '问答成功',
        data: result
      };
    } catch (error) {
      console.error('Failed to query knowledge base:', error);
      return { 
        error: error instanceof Error ? error.message : '知识库问答失败，请重试'
      };
    }
  }
);

// 获取问答历史
export async function getQaHistory(knowledgeBaseId: string, limit?: number, offset?: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: '用户未登录' };
    }

    const history = await knowledgeBaseApi.getQaHistory(knowledgeBaseId, limit, offset);
    
    return { success: true, data: history };
  } catch (error) {
    console.error('Failed to get QA history:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取问答历史失败'
    };
  }
}

// 获取知识库中的文件
export async function getKnowledgeBaseFiles(knowledgeBaseId: string) {
  try {
    const files = await knowledgeBaseApi.getKnowledgeBaseFiles(knowledgeBaseId);
    return { success: true, data: files };
  } catch (error) {
    console.error('Failed to get knowledge base files:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取知识库文件失败'
    };
  }
}

// 获取知识库统计信息
export async function getKnowledgeBaseStats(difyDatasetId: string) {
  try {
    const stats = await knowledgeBaseApi.getKnowledgeBaseStats(difyDatasetId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to get knowledge base stats:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取知识库统计信息失败'
    };
  }
}

// 获取Dify知识库文档列表
export async function getDifyDocuments(difyDatasetId: string, page: number = 1, limit: number = 20) {
  try {
    const result = await knowledgeBaseApi.getDifyDocuments(difyDatasetId, page, limit);
    return result;
  } catch (error) {
    console.error('Failed to get Dify documents:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取知识库文档失败',
      documents: [],
      hasMore: false,
      total: 0,
      page: 1,
      limit: 20
    };
  }
}