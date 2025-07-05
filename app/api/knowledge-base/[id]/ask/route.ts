import {NextRequest, NextResponse} from 'next/server';
import {logger} from '@/lib/logger';
import {getUser} from '@/lib/db/queries';
import {withConnection} from '@/lib/db';
import {knowledgeBases, qaConversations} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

/**
 * 知识库问答接口
 *
 * 使用Dify的应用API进行问答，支持基于已上传文档的智能回答
 */
export async function POST(request: NextRequest, {params}: RouteParams) {
    try {
        // 验证用户身份
        const user = await getUser();
        if (!user) {
            return NextResponse.json({error: '用户未登录'}, {status: 401});
        }

        const {id: knowledgeBaseId} = await params;
        const {question, topK = 5, scoreThreshold = 0.3} = await request.json();

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return NextResponse.json({error: '问题不能为空'}, {status: 400});
        }

        logger.info('收到知识库问答请求', {
            knowledgeBaseId, question: question.substring(0, 100), // 只记录前100字符
            userId: user.id
        });

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
            return NextResponse.json({error: '知识库不存在'}, {status: 404});
        }

        const startTime = Date.now();

        // 方案1：使用Dify应用API进行对话
        const apiKey = process.env.DIFY_API_KEY;
        if (!apiKey) {
            logger.error('未配置DIFY_API_KEY环境变量');
            return NextResponse.json({error: 'API密钥未配置'}, {status: 500});
        }

        try {
            // 方案1：先尝试使用数据集检索API（如果有数据集API密钥）
            const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
            let answer = '';
            let sources: any[] = [];
            let confidence = 0;

            if (datasetApiKey && knowledgeBase.difyDatasetId) {
                try {
                    // 使用数据集检索API
                    const retrievalResponse = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/retrieve`, {
                        method: 'POST', headers: {
                            'Authorization': `Bearer ${datasetApiKey}`, 'Content-Type': 'application/json',
                        }, body: JSON.stringify({
                            query: question, retrieval_setting: {
                                top_k: topK, score_threshold: scoreThreshold
                            }
                        }),
                    });

                    if (retrievalResponse.ok) {
                        const retrievalData = await retrievalResponse.json();
                        sources = retrievalData.records || [];

                        // 基于检索结果生成答案
                        if (sources.length > 0) {
                            // 使用检索到的内容生成更好的答案
                            const context = sources.slice(0, 3).map(record => record.content).join('\n\n');

                            // 调用LLM生成基于上下文的答案
                            const llmResponse = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_URL}/chat-messages`, {
                                method: 'POST', headers: {
                                    'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
                                }, body: JSON.stringify({
                                    inputs: {
                                        context: context, user_question: question
                                    },
                                    query: `基于以下上下文信息，回答用户问题：\n\n上下文：\n${context}\n\n用户问题：${question}\n\n请基于上下文提供准确、有帮助的回答。如果上下文中没有相关信息，请诚实说明。`,
                                    response_mode: 'blocking',
                                    conversation_id: '',
                                    user: user.id,
                                }),
                            });

                            if (llmResponse.ok) {
                                const llmData = await llmResponse.json();
                                answer = llmData.answer || '抱歉，我无法基于现有知识库内容回答您的问题。';
                            } else {
                                // LLM调用失败，使用简单拼接答案
                                answer = `基于知识库中的相关内容，我找到了以下信息：\n\n${context}\n\n请注意，这些信息来源于您上传的文档。如需更详细的信息，建议查看完整的原始文档。`;
                            }

                            // 计算置信度
                            confidence = Math.min(sources.reduce((sum, source) => sum + (source.score || 0.5), 0) / sources.length, 1);
                        } else {
                            answer = '抱歉，在知识库中没有找到与您问题相关的信息。请尝试用不同的方式表达您的问题，或查看完整的项目文档。';
                            confidence = 0.1;
                        }

                        logger.info('使用数据集检索API成功', {
                            knowledgeBaseId, sourcesCount: sources.length, confidence
                        });
                    } else {
                        throw new Error('数据集检索API调用失败');
                    }
                } catch (retrievalError) {
                    logger.warn('数据集检索API失败，回退到应用API', {error: retrievalError});
                    throw retrievalError; // 让外层catch处理回退
                }
            } else {
                throw new Error('没有数据集API密钥，使用应用API');
            }

            const responseTime = (Date.now() - startTime) / 1000;

            // 保存问答记录到数据库
            try {
                const savedConversation = await withConnection(async (db) => {
                    const [conversation] = await db.insert(qaConversations).values({
                        knowledgeBaseId, userId: user.id, question, answer, sources, responseTime, confidence
                    }).returning();
                    return conversation;
                });

                logger.info('问答记录已保存', {
                    conversationId: savedConversation.id, knowledgeBaseId
                });
            } catch (dbError) {
                logger.error('保存问答记录失败', {error: dbError});
                // 不阻断响应，继续返回答案
            }

            return NextResponse.json({
                success: true, data: {
                    id: `qa-${Date.now()}`, answer, sources, confidence, responseTime, method: 'dataset_retrieval'
                }
            });

        } catch (error) {
            logger.error('知识库问答处理失败', {error});

            return NextResponse.json({error: '问答处理失败，请稍后重试'}, {status: 500});
        }
    } catch (error) {
        logger.error('知识库问答请求处理失败', {error});
        return NextResponse.json({error: '服务器内部错误，请稍后重试'}, {status: 500});
    }
}