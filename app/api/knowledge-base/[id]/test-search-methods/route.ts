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
 * 测试不同检索方法的API
 * 比较vector_search, keyword_search, hybrid_search的结果差异
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: '用户未登录' }, { status: 401 });
        }

        const { id: knowledgeBaseId } = await params;
        const { query, top_k = 5, score_threshold = 0.1 } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: '查询内容不能为空' }, { status: 400 });
        }

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
                error: '知识库检索服务未配置' 
            }, { status: 500 });
        }

        // 测试三种不同的搜索方法
        const searchMethods = ['vector_search', 'keyword_search', 'hybrid_search'];
        const results: any = {};

        for (const method of searchMethods) {
            const startTime = Date.now();
            
            const retrievalPayload = {
                query: query,
                retrieval_model: {
                    search_method: method,
                    reranking_enable: false,
                    reranking_mode: null,
                    reranking_model: {
                        reranking_provider_name: "",
                        reranking_model_name: ""
                    },
                    weights: method === 'hybrid_search' ? {
                        vector_setting: { vector_weight: 0.7 },
                        keyword_setting: { keyword_weight: 0.3 }
                    } : null,
                    top_k: parseInt(top_k),
                    score_threshold_enabled: true,
                    score_threshold: parseFloat(score_threshold)
                }
            };

            try {
                const response = await fetch(
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

                if (response.ok) {
                    const data = await response.json();
                    const records = data.records || [];
                    
                    results[method] = {
                        success: true,
                        recordCount: records.length,
                        responseTime,
                        records: records.map((record: any) => ({
                            score: record.score,
                            segmentId: record.segment?.id,
                            documentName: record.segment?.document?.name,
                            contentPreview: record.segment?.content?.substring(0, 100)
                        })),
                        duplicateSegments: findDuplicateSegments(records),
                        uniqueSegments: new Set(records.map((r: any) => r.segment?.id)).size
                    };
                } else {
                    const errorText = await response.text();
                    results[method] = {
                        success: false,
                        error: `${response.status}: ${errorText}`,
                        responseTime
                    };
                }
            } catch (error) {
                results[method] = {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    responseTime: (Date.now() - startTime) / 1000
                };
            }
        }

        logger.info('搜索方法对比测试', {
            query: query.substring(0, 100),
            results: Object.keys(results).map(method => ({
                method,
                recordCount: results[method].recordCount || 0,
                uniqueSegments: results[method].uniqueSegments || 0,
                hasDuplicates: (results[method].duplicateSegments || []).length > 0
            }))
        });

        return NextResponse.json({
            success: true,
            data: {
                query,
                searchMethods: results,
                summary: {
                    totalMethods: searchMethods.length,
                    successfulMethods: Object.values(results).filter((r: any) => r.success).length,
                    methodsWithDuplicates: Object.keys(results).filter(method => 
                        results[method].duplicateSegments && results[method].duplicateSegments.length > 0
                    )
                }
            }
        });

    } catch (error) {
        logger.error('搜索方法对比测试失败', { error });
        return NextResponse.json({ 
            success: false,
            error: '服务器内部错误'
        }, { status: 500 });
    }
}

// 帮助函数：查找重复的segments
function findDuplicateSegments(records: any[]) {
    const segmentCounts: { [key: string]: number } = {};
    records.forEach((record: any) => {
        const segmentId = record.segment?.id;
        if (segmentId) {
            segmentCounts[segmentId] = (segmentCounts[segmentId] || 0) + 1;
        }
    });
    
    return Object.entries(segmentCounts)
        .filter(([_, count]) => count > 1)
        .map(([segmentId, count]) => ({ segmentId, count }));
}