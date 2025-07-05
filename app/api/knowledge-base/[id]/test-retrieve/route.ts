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
 * 知识库检索测试接口
 * 直接测试检索API，不进行LLM处理
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // 验证用户身份
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: '用户未登录' }, { status: 401 });
        }

        const { id: knowledgeBaseId } = await params;
        const { query, top_k = 10, score_threshold = 0.1 } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: '查询内容不能为空' }, { status: 400 });
        }

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

        const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
        if (!datasetApiKey || !knowledgeBase.difyDatasetId) {
            return NextResponse.json({ 
                error: '知识库检索服务未配置',
                details: {
                    hasApiKey: !!datasetApiKey,
                    hasDatasetId: !!knowledgeBase.difyDatasetId
                }
            }, { status: 500 });
        }

        const startTime = Date.now();

        // 使用数据集检索API
        const retrievalPayload = {
            query: query,
            retrieval_model: {
                search_method: "hybrid_search",
                reranking_enable: false,
                reranking_mode: null,
                reranking_model: {
                    reranking_provider_name: "",
                    reranking_model_name: ""
                },
                weights: {
                    vector_setting: {
                        vector_weight: 0.7
                    },
                    keyword_setting: {
                        keyword_weight: 0.3
                    }
                },
                top_k: parseInt(top_k),
                score_threshold_enabled: true,
                score_threshold: parseFloat(score_threshold)
            }
        };

        logger.info('测试检索API调用', { 
            datasetId: knowledgeBase.difyDatasetId,
            query: query.substring(0, 100),
            payload: retrievalPayload 
        });

        const retrievalResponse = await fetch(
            `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/retrieve`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${datasetApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(retrievalPayload),
            }
        );

        const responseTime = (Date.now() - startTime) / 1000;

        if (retrievalResponse.ok) {
            const retrievalData = await retrievalResponse.json();
            let records = retrievalData.records || [];

            // 去重处理：优先保留有score的版本
            const segmentMap = new Map();
            
            records.forEach((record: any) => {
                const segmentId = record.segment?.id;
                if (!segmentId) return;
                
                const existing = segmentMap.get(segmentId);
                if (!existing) {
                    segmentMap.set(segmentId, record);
                } else {
                    const currentHasScore = record.score !== null && record.score !== undefined;
                    const existingHasScore = existing.score !== null && existing.score !== undefined;
                    
                    if (currentHasScore && !existingHasScore) {
                        segmentMap.set(segmentId, record);
                    } else if (currentHasScore && existingHasScore && record.score > existing.score) {
                        segmentMap.set(segmentId, record);
                    }
                }
            });
            
            const uniqueRecords = Array.from(segmentMap.values());

            logger.info('测试检索结果', {
                originalRecordCount: records.length,
                uniqueRecordCount: uniqueRecords.length,
                removedDuplicates: records.length - uniqueRecords.length,
                responseTime,
                query: query.substring(0, 100)
            });

            return NextResponse.json({
                success: true,
                data: {
                    query: query,
                    originalRecordCount: records.length,
                    recordCount: uniqueRecords.length,
                    removedDuplicates: records.length - uniqueRecords.length,
                    responseTime,
                    records: uniqueRecords.map((record: any) => ({
                        score: record.score,
                        documentName: record.segment?.document?.name,
                        documentId: record.segment?.document?.id,
                        segmentId: record.segment?.id,
                        content: record.segment?.content,
                        contentPreview: record.segment?.content?.substring(0, 200) + '...',
                        position: record.segment?.position,
                        wordCount: record.segment?.word_count,
                        isEnabled: record.segment?.enabled,
                        status: record.segment?.status
                    })),
                    allRecords: records.map((record: any) => ({
                        score: record.score,
                        segmentId: record.segment?.id,
                        contentPreview: record.segment?.content?.substring(0, 100)
                    })),
                    rawResponse: retrievalData
                }
            });
        } else {
            const errorText = await retrievalResponse.text();
            logger.error('测试检索API调用失败', { 
                status: retrievalResponse.status,
                error: errorText,
                datasetId: knowledgeBase.difyDatasetId
            });

            return NextResponse.json({
                success: false,
                error: `检索API调用失败: ${retrievalResponse.status}`,
                details: errorText,
                responseTime
            }, { status: retrievalResponse.status });
        }

    } catch (error) {
        logger.error('测试检索接口失败', { error });
        return NextResponse.json({ 
            success: false,
            error: '服务器内部错误',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}