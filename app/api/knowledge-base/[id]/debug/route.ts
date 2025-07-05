import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUser } from '@/lib/db/queries';
import { withConnection } from '@/lib/db';
import { knowledgeBases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

/**
 * 知识库调试接口
 * 用于检查知识库文档状态和配置
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // 验证用户身份
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: '用户未登录' }, { status: 401 });
        }

        const { id: knowledgeBaseId } = await params;

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

        const debugInfo: any = {
            knowledgeBase: {
                id: knowledgeBase.id,
                name: knowledgeBase.name,
                difyDatasetId: knowledgeBase.difyDatasetId
            },
            configuration: {
                hasDifyApiKey: !!process.env.DIFY_API_KEY,
                hasDatasetApiKey: !!process.env.DIFY_DATASET_API_KEY,
                difyApiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL
            },
            documents: null,
            error: null
        };

        // 如果有数据集API密钥，尝试获取文档列表
        const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
        if (datasetApiKey && knowledgeBase.difyDatasetId) {
            try {
                const documentsResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/documents`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${datasetApiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (documentsResponse.ok) {
                    const documentsData = await documentsResponse.json();
                    debugInfo.documents = {
                        total: documentsData.total || 0,
                        documents: documentsData.data?.map((doc: any) => ({
                            id: doc.id,
                            name: doc.name,
                            indexing_status: doc.indexing_status,
                            enabled: doc.enabled,
                            word_count: doc.word_count,
                            created_at: doc.created_at,
                            error: doc.error
                        })) || []
                    };
                } else {
                    const errorText = await documentsResponse.text();
                    debugInfo.error = `获取文档列表失败: ${documentsResponse.status} - ${errorText}`;
                }
            } catch (error) {
                debugInfo.error = `API调用异常: ${error instanceof Error ? error.message : String(error)}`;
            }
        } else {
            debugInfo.error = '缺少必要的API配置';
        }

        logger.info('知识库调试信息', debugInfo);

        return NextResponse.json({
            success: true,
            data: debugInfo
        });

    } catch (error) {
        logger.error('知识库调试接口失败', { error });
        return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
    }
}