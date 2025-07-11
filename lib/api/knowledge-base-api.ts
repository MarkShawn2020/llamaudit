import { withConnection } from '../db';
import { knowledgeBases, qaConversations, files, auditUnits, users, NewKnowledgeBase, NewQaConversation } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface DifyDatasetCreateRequest {
  name: string;
  type: string;
  permission?: 'only_me' | 'all_team_members' | 'partial_members';
  indexing_technique?: 'high_quality' | 'economy';
  embedding_model?: string;
  embedding_model_provider?: string;
}

export interface DifyDatasetResponse {
  id: string;
  name: string;
  description: string | null;
  permission: string;
  data_source_type: string | null;
  indexing_technique: string | null;
  app_count: number;
  document_count: number;
  word_count: number;
  created_by: string;
  created_at: number;
  updated_by: string;
  updated_at: number;
  embedding_model: string | null;
  embedding_model_provider: string | null;
  embedding_available: boolean | null;
}

export interface DifyRetrievalRequest {
  query: string;
  retrieval_setting: {
    top_k: number;
    score_threshold: number;
  };
  knowledge_id?: string;
}

export interface DifyRetrievalResponse {
  records: Array<{
    content: string;
    score: number;
    title: string;
    metadata?: Record<string, any>;
  }>;
}

// 知识库 API 类
export class KnowledgeBaseApi {
  private difyApiKey: string;
  private difyBaseUrl: string;

  constructor() {
    // 优先使用数据集API密钥进行知识库管理
    this.difyApiKey = process.env.DIFY_DATASET_API_KEY || process.env.DIFY_API_KEY || '';
    this.difyBaseUrl = process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://api.dify.ai';
  }

  // 创建知识库
  async createKnowledgeBase(auditUnitId: string, data: {
    name: string;
    description?: string;
    indexingTechnique?: string;
    permission?: string;
    createdBy: string;
  }) {
    return withConnection(async (db) => {
      // 获取审计单位信息
      const [auditUnit] = await db
        .select()
        .from(auditUnits)
        .where(eq(auditUnits.id, auditUnitId))
        .limit(1);

      if (!auditUnit) {
        throw new Error('审计单位不存在');
      }

      // 获取用户信息
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.createdBy))
        .limit(1);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 生成知识库名称：llamaudit.userName.auditUnitName
      const prefix = 'llamaudit';
      const userName = user.name || 'user';
      const auditUnitName = auditUnit.name;
      
      // 计算可用空间，确保审计单位名称能够完整显示
      const maxLength = 40;
      const prefixLength = prefix.length + 1; // +1 for the dot
      const remainingLength = maxLength - prefixLength;
      
      let knowledgeBaseName: string;
      
      if (remainingLength >= userName.length + 1 + auditUnitName.length) {
        // 如果总长度不超过40个字符，使用完整名称
        knowledgeBaseName = `${prefix}.${userName}.${auditUnitName}`;
      } else {
        // 如果超过40个字符，优先保留审计单位名称，截断用户名
        const maxUserNameLength = remainingLength - 1 - auditUnitName.length; // -1 for the dot between userName and auditUnitName
        
        if (maxUserNameLength > 2) {
          // 如果用户名有足够空间，截断用户名
          const truncatedUserName = userName.substring(0, maxUserNameLength);
          knowledgeBaseName = `${prefix}.${truncatedUserName}.${auditUnitName}`;
        } else {
          // 如果空间不够，只保留审计单位名称
          const maxAuditUnitLength = remainingLength;
          const truncatedAuditUnitName = auditUnitName.length > maxAuditUnitLength 
            ? auditUnitName.substring(0, maxAuditUnitLength)
            : auditUnitName;
          knowledgeBaseName = `${prefix}.${truncatedAuditUnitName}`;
        }
      }

      // 首先在 Dify 中创建知识库
      const difyDataset = await this.createDifyDataset({
        name: knowledgeBaseName,
        type: 'knowledge_base',
        permission: data.permission as any || 'only_me',
        indexing_technique: data.indexingTechnique as any || 'high_quality'
      });

      // 在本地数据库中创建记录
      const newKnowledgeBase: NewKnowledgeBase = {
        auditUnitId,
        difyDatasetId: difyDataset.id,
        name: knowledgeBaseName,
        description: data.description,
        indexingTechnique: data.indexingTechnique || 'high_quality',
        permission: data.permission || 'only_me',
        embeddingModel: difyDataset.embedding_model,
        embeddingModelProvider: difyDataset.embedding_model_provider,
        createdBy: data.createdBy
      };

      const [knowledgeBase] = await db.insert(knowledgeBases).values(newKnowledgeBase).returning();
      return knowledgeBase;
    });
  }

  // 获取项目的知识库列表
  async getKnowledgeBasesByAuditUnit(auditUnitId: string) {
    return withConnection(async (db) => {
      return await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.auditUnitId, auditUnitId))
        .orderBy(desc(knowledgeBases.createdAt));
    });
  }

  // 获取知识库详情
  async getKnowledgeBase(id: string) {
    return withConnection(async (db) => {
      const [knowledgeBase] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, id))
        .limit(1);
      
      if (!knowledgeBase) {
        throw new Error('知识库不存在');
      }

      return knowledgeBase;
    });
  }

  // 获取知识库统计信息（包含文档数量）
  async getKnowledgeBaseStats(difyDatasetId: string) {
    try {
      const response = await fetch(`${this.difyBaseUrl}/datasets/${difyDatasetId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.difyApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dataset stats: ${response.statusText}`);
      }

      const data: DifyDatasetResponse = await response.json();
      return {
        documentCount: data.document_count,
        wordCount: data.word_count,
        appCount: data.app_count
      };
    } catch (error) {
      console.error('Error fetching knowledge base stats:', error);
      return { documentCount: 0, wordCount: 0, appCount: 0 };
    }
  }

  // 获取Dify知识库中的文档列表
  async getDifyDocuments(difyDatasetId: string, page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${this.difyBaseUrl}/datasets/${difyDatasetId}/documents?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.difyApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        documents: data.data || [],
        hasMore: data.has_more || false,
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 20
      };
    } catch (error) {
      console.error('Error fetching Dify documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
        documents: [],
        hasMore: false,
        total: 0,
        page: 1,
        limit: 20
      };
    }
  }

  // 更新知识库
  async updateKnowledgeBase(id: string, data: {
    name?: string;
    description?: string;
    retrievalConfig?: any;
  }) {
    return withConnection(async (db) => {
      const [updatedKnowledgeBase] = await db
        .update(knowledgeBases)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(knowledgeBases.id, id))
        .returning();

      return updatedKnowledgeBase;
    });
  }

  // 删除知识库
  async deleteKnowledgeBase(id: string) {
    return withConnection(async (db) => {
      const knowledgeBase = await this.getKnowledgeBase(id);
      
      // 删除 Dify 中的知识库
      await this.deleteDifyDataset(knowledgeBase.difyDatasetId);

      // 删除本地记录
      await db.delete(knowledgeBases).where(eq(knowledgeBases.id, id));
    });
  }

  // 知识库问答
  async queryKnowledgeBase(knowledgeBaseId: string, question: string, userId: string, options?: {
    topK?: number;
    scoreThreshold?: number;
  }) {
    return withConnection(async (db) => {
      const knowledgeBase = await this.getKnowledgeBase(knowledgeBaseId);
      
      const startTime = Date.now();
      
      // 调用 Dify 检索 API
      const retrievalResult = await this.retrieveFromDify(knowledgeBase.difyDatasetId, {
        query: question,
        retrieval_setting: {
          top_k: options?.topK || 5,
          score_threshold: options?.scoreThreshold || 0.5
        }
      });

      const responseTime = (Date.now() - startTime) / 1000;

      // 生成答案（这里可以进一步调用大模型 API 基于检索结果生成答案）
      const answer = this.generateAnswerFromRetrieval(retrievalResult, question);
      
      // 保存问答记录
      const conversation: NewQaConversation = {
        knowledgeBaseId,
        userId,
        question,
        answer,
        sources: retrievalResult.records,
        responseTime,
        confidence: this.calculateConfidence(retrievalResult.records)
      };

      const [savedConversation] = await db.insert(qaConversations).values(conversation).returning();
      
      return {
        ...savedConversation,
        retrievalResult
      };
    });
  }

  // 获取问答历史
  async getQaHistory(knowledgeBaseId: string, limit: number = 20, offset: number = 0) {
    return withConnection(async (db) => {
      return await db
        .select()
        .from(qaConversations)
        .where(eq(qaConversations.knowledgeBaseId, knowledgeBaseId))
        .orderBy(desc(qaConversations.createdAt))
        .limit(limit)
        .offset(offset);
    });
  }

  // 获取知识库中的文件
  async getKnowledgeBaseFiles(knowledgeBaseId: string) {
    return withConnection(async (db) => {
      return await db
        .select()
        .from(files)
        .where(eq(files.knowledgeBaseId, knowledgeBaseId))
        .orderBy(desc(files.uploadDate));
    });
  }

  // === Private Methods ===

  // 获取所有 Dify 数据集
  private async getDifyDatasets(): Promise<DifyDatasetResponse[]> {
    const response = await fetch(`${this.difyBaseUrl}/datasets`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.difyApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Dify datasets: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  // 创建 Dify 知识库
  private async createDifyDataset(data: DifyDatasetCreateRequest): Promise<DifyDatasetResponse> {
    // 先检查是否已存在同名数据集
    const existingDatasets = await this.getDifyDatasets();
    const existingDataset = existingDatasets.find(dataset => dataset.name === data.name);
    
    if (existingDataset) {
      console.log(`Found existing dataset: ${data.name}, reusing it`);
      return existingDataset;
    }

    // 不存在则创建新的数据集
    const response = await fetch(`${this.difyBaseUrl}/datasets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.difyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Dify dataset: ${error}`);
    }

    return await response.json();
  }

  // 删除 Dify 知识库
  private async deleteDifyDataset(datasetId: string): Promise<void> {
    const response = await fetch(`${this.difyBaseUrl}/datasets/${datasetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.difyApiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete Dify dataset: ${error}`);
    }
  }

  // 从 Dify 检索内容
  private async retrieveFromDify(datasetId: string, request: DifyRetrievalRequest): Promise<DifyRetrievalResponse> {
    const response = await fetch(`${this.difyBaseUrl}/datasets/${datasetId}/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.difyApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to retrieve from Dify: ${error}`);
    }

    return await response.json();
  }

  // 基于检索结果生成答案
  private generateAnswerFromRetrieval(retrievalResult: DifyRetrievalResponse, question: string): string {
    if (retrievalResult.records.length === 0) {
      return '抱歉，在知识库中没有找到相关信息来回答您的问题。';
    }

    // 简单的答案生成逻辑，实际项目中可以调用大模型 API
    const topResults = retrievalResult.records.slice(0, 3);
    const context = topResults.map(record => record.content).join('\n\n');
    
    return `基于知识库中的相关内容，我找到了以下信息：\n\n${context}\n\n请注意，这些信息来源于您上传的文档。如需更详细的信息，建议查看完整的原始文档。`;
  }

  // 计算置信度
  private calculateConfidence(records: DifyRetrievalResponse['records']): number {
    if (records.length === 0) return 0;
    
    // 基于最高分数和记录数量计算置信度
    const maxScore = Math.max(...records.map(r => r.score));
    const recordCount = Math.min(records.length, 5); // 最多考虑5个结果
    
    return Math.min(maxScore * (recordCount / 5), 1);
  }
}

// 导出单例实例
export const knowledgeBaseApi = new KnowledgeBaseApi();