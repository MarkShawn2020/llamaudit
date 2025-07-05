import {NextRequest, NextResponse} from 'next/server';
import {logger} from '@/lib/logger';
import {getUser} from '@/lib/db/queries';
import {withConnection} from '@/lib/db';
import {knowledgeBases, qaConversations} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';

// 问题分类类型
type QuestionType = 'irrelevant' | 'project_related' | 'technical_term' | 'community' | 'greeting';

// 问题分类结果
interface QuestionClassification {
    type: QuestionType;
    confidence: number;
    reasoning: string;
}

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

/**
 * 问题分类函数
 * 基于Dify文档最佳实践，对用户问题进行意图识别和分类
 */
async function classifyQuestion(question: string, knowledgeBaseName: string): Promise<QuestionClassification> {
    // 简单的规则引擎进行问题分类
    const lowerQuestion = question.toLowerCase();
    
    // 问候语检测
    if (/^(你好|hi|hello|嗨|您好)/.test(lowerQuestion)) {
        return {
            type: 'greeting',
            confidence: 0.9,
            reasoning: '检测到问候语'
        };
    }
    
    // 无关问题检测
    const irrelevantKeywords = ['天气', '股票', '娱乐', '游戏', '吃饭', '购物', '旅游', '明星'];
    if (irrelevantKeywords.some(keyword => lowerQuestion.includes(keyword))) {
        return {
            type: 'irrelevant',
            confidence: 0.8,
            reasoning: '问题与项目无关'
        };
    }
    
    // 社区相关问题
    if (/社区|群|加入|联系|讨论|交流/.test(lowerQuestion)) {
        return {
            type: 'community',
            confidence: 0.85,
            reasoning: '用户询问社区相关信息'
        };
    }
    
    // 技术术语解释
    if (/什么是|是什么|解释|定义|含义/.test(lowerQuestion) && 
        /api|sdk|embedding|向量|token|llm|ai|机器学习|深度学习/.test(lowerQuestion)) {
        return {
            type: 'technical_term',
            confidence: 0.8,
            reasoning: '用户询问技术术语解释'
        };
    }
    
    // 默认为项目相关问题
    return {
        type: 'project_related',
        confidence: 0.7,
        reasoning: '默认为项目相关问题'
    };
}

/**
 * 处理不同类型的问题
 */
async function handleClassifiedQuestion(
    classification: QuestionClassification,
    question: string,
    knowledgeBase: any,
    user: any
): Promise<{ answer: string; sources?: any[]; confidence: number; method: string }> {
    
    switch (classification.type) {
        case 'greeting':
            return {
                answer: `👋 您好！我是${knowledgeBase.name}的智能助手。

我可以帮您：
• 回答项目相关的技术问题
• 解释代码实现和架构
• 提供最佳实践建议
• 解答文档中的内容

请随时向我提问！`,
                confidence: 0.9,
                method: 'direct_reply'
            };
            
        case 'irrelevant':
            return {
                answer: `抱歉，我专注于回答与${knowledgeBase.name}项目相关的问题。

如果您有其他需要帮助的问题，建议您：
• 查看项目文档
• 联系项目维护者
• 在相关社区寻求帮助

请问有什么项目相关的问题我可以帮您解答吗？`,
                confidence: 0.8,
                method: 'direct_reply'
            };
            
        case 'community':
            return {
                answer: `关于社区交流和支持：

• **GitHub Issues**: 可以在项目GitHub页面提交问题和建议
• **讨论区**: 在GitHub Discussions中参与社区讨论
• **文档**: 查看完整的项目文档获取详细信息

如果您有具体的技术问题，我很乐意为您解答！`,
                confidence: 0.85,
                method: 'direct_reply'
            };
            
        case 'technical_term':
            // 对于技术术语，我们仍然使用知识库检索，但会特别处理
            return await performKnowledgeRetrieval(question, knowledgeBase, user, '技术术语解释');
            
        case 'project_related':
        default:
            return await performKnowledgeRetrieval(question, knowledgeBase, user, '项目相关问答');
    }
}

/**
 * 执行知识库检索
 */
async function performKnowledgeRetrieval(
    question: string,
    knowledgeBase: any,
    user: any,
    method: string
): Promise<{ answer: string; sources?: any[]; confidence: number; method: string }> {
    const apiKey = process.env.DIFY_API_KEY;
    const datasetApiKey = process.env.DIFY_DATASET_API_KEY;
    
    if (!apiKey) {
        throw new Error('API密钥未配置');
    }
    
    let answer = '';
    let sources: any[] = [];
    let confidence = 0;
    
    if (datasetApiKey && knowledgeBase.difyDatasetId) {
        try {
            logger.info('开始知识库检索', {
                datasetId: knowledgeBase.difyDatasetId,
                question: question.substring(0, 100),
                method
            });

            // 使用数据集检索API，按照Dify文档格式
            const retrievalPayload = {
                query: question,
                retrieval_model: {
                    search_method: "hybrid_search", // 混合搜索效果更好
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
                    top_k: 10, // 增加检索数量
                    score_threshold_enabled: true,
                    score_threshold: 0.1 // 降低阈值，增加召回
                }
            };

            logger.info('检索API调用参数', { 
                url: `${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/retrieve`,
                payload: retrievalPayload 
            });

            const retrievalResponse = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_URL}/datasets/${knowledgeBase.difyDatasetId}/retrieve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${datasetApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(retrievalPayload),
            });

            logger.info('检索API响应状态', { 
                status: retrievalResponse.status,
                statusText: retrievalResponse.statusText 
            });

            if (retrievalResponse.ok) {
                const retrievalData = await retrievalResponse.json();
                sources = retrievalData.records || [];
                
                logger.info('检索结果', {
                    recordCount: sources.length,
                    records: sources.map(r => ({
                        score: r.score,
                        documentName: r.segment?.document?.name,
                        contentPreview: r.segment?.content?.substring(0, 100)
                    }))
                });

                if (sources.length > 0) {
                    // Dify API返回的数据结构：record.segment.content
                    const context = sources.slice(0, 3).map(record => record.segment?.content || '').filter(Boolean).join('\n\n');
                    
                    // 根据问题类型调整提示词
                    let prompt = '';
                    if (method === '技术术语解释') {
                        prompt = `你是一个专业的技术文档助手。请基于以下文档内容，用自然语言详细解释用户询问的技术术语或概念。

重要：请直接用自然语言回答，不要返回JSON或结构化数据。

文档内容：
${context}

用户问题：${question}

请提供清晰易懂的解释，包括：
- 术语的定义和含义
- 在项目中的应用场景
- 相关的技术细节
- 实际使用建议

如果文档中没有直接相关的信息，请诚实说明并提供通用的技术解释。`;
                    } else {
                        prompt = `你是一个专业的技术文档助手。请基于以下文档内容用自然语言回答用户问题。

重要：请直接用自然语言回答，不要返回JSON、结构化数据或代码格式。

文档内容：
${context}

用户问题：${question}

请提供准确、有帮助的回答，包括：
- 基于文档内容的详细解答
- 相关的最佳实践建议
- 实际的使用指导

如果文档中没有足够信息回答问题，请诚实说明并建议用户查看完整文档或寻求进一步帮助。`;
                    }

                    // 调用LLM生成答案
                    const llmResponse = await fetch(`${process.env.NEXT_PUBLIC_DIFY_API_URL}/chat-messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            inputs: {
                                context: context,
                                user_question: question
                            },
                            query: prompt,
                            response_mode: 'blocking',
                            conversation_id: '',
                            user: user.id,
                        }),
                    });

                    if (llmResponse.ok) {
                        const llmData = await llmResponse.json();
                        let rawAnswer = llmData.answer || '抱歉，我无法基于现有知识库内容回答您的问题。';
                        
                        logger.info('Dify API原始回复', {
                            rawAnswer: rawAnswer.substring(0, 200),
                            isLikelyJson: rawAnswer.trim().startsWith('{')
                        });
                        
                        // 检查并处理可能的JSON格式回复
                        try {
                            const possibleJson = JSON.parse(rawAnswer);
                            if (typeof possibleJson === 'object' && possibleJson !== null) {
                                // 如果返回的是JSON，转换为自然语言
                                logger.warn('检测到JSON格式回复，正在转换为自然语言', { json: possibleJson });
                                answer = '基于文档内容，我为您整理了以下信息：\n\n';
                                Object.entries(possibleJson).forEach(([key, value]) => {
                                    if (value && value !== '未提及' && value !== '未找到') {
                                        answer += `• **${key}**: ${value}\n`;
                                    }
                                });
                                answer += '\n如需更详细信息，请查看完整文档或尝试其他问题。';
                            } else {
                                answer = rawAnswer;
                            }
                        } catch {
                            // 不是JSON格式，直接使用原始答案
                            answer = rawAnswer;
                        }
                    } else {
                        const errorData = await llmResponse.json().catch(() => ({}));
                        logger.error('Dify API调用失败', { 
                            status: llmResponse.status, 
                            error: errorData 
                        });
                        answer = `基于文档内容，我找到了以下相关信息：\n\n${context}\n\n建议您查看完整的原始文档获取更多详细信息。`;
                    }

                    // 计算置信度并格式化sources
                    confidence = Math.min(sources.reduce((sum, source) => sum + (source.score || 0.1), 0) / sources.length, 1);
                    
                    // 格式化sources为前端期望的格式
                    sources = sources.map(record => ({
                        content: record.segment?.content || '',
                        score: record.score || 0,
                        title: record.segment?.document?.name || '未知文档',
                        metadata: {
                            document_id: record.segment?.document_id,
                            segment_id: record.segment?.id,
                            position: record.segment?.position
                        }
                    }));
                } else {
                    logger.warn('检索未找到相关文档', { 
                        question: question.substring(0, 100),
                        datasetId: knowledgeBase.difyDatasetId 
                    });
                    
                    answer = `抱歉，在知识库中没有找到与您问题相关的信息。

可能的原因：
• 文档可能还在索引处理中
• 问题与知识库内容不匹配
• 尝试用不同的关键词重新提问

建议您：
• 使用文档中的具体术语或关键词
• 检查文档名称是否正确
• 确认文档已成功上传到知识库

有什么其他问题我可以帮您解答吗？`;
                    confidence = 0.1;
                }
            } else {
                const errorText = await retrievalResponse.text();
                logger.error('数据集检索API调用失败', { 
                    status: retrievalResponse.status,
                    statusText: retrievalResponse.statusText,
                    error: errorText,
                    datasetId: knowledgeBase.difyDatasetId
                });
                throw new Error(`检索API调用失败: ${retrievalResponse.status} - ${errorText}`);
            }
        } catch (error) {
            logger.error('知识库检索失败', { error });
            throw error;
        }
    } else {
        logger.error('知识库检索配置缺失', { 
            hasDatasetApiKey: !!datasetApiKey,
            hasDifyDatasetId: !!knowledgeBase.difyDatasetId,
            knowledgeBaseId: knowledgeBase.id 
        });
        
        // 提供友好的错误信息
        answer = `抱歉，知识库检索功能暂时不可用。

可能的原因：
• 知识库还未配置检索服务
• 系统配置有误

请联系管理员检查：
• DIFY_DATASET_API_KEY 环境变量配置
• 知识库的 Dify Dataset ID 设置
• 网络连接是否正常

您也可以尝试：
• 稍后重试
• 联系技术支持
• 查看项目文档`;
        
        confidence = 0.1;
        sources = [];
    }
    
    return { answer, sources, confidence, method };
}

/**
 * 知识库问答接口
 *
 * 使用意图识别和分类处理，提供更智能的问答体验
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

        // 第一步：对问题进行分类
        const classification = await classifyQuestion(question, knowledgeBase.name);
        
        logger.info('问题分类结果', {
            knowledgeBaseId,
            questionType: classification.type,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            question: question.substring(0, 100)
        });

        try {
            // 第二步：根据分类结果处理问题
            const result = await handleClassifiedQuestion(classification, question, knowledgeBase, user);
            
            const responseTime = (Date.now() - startTime) / 1000;

            // 保存问答记录到数据库
            try {
                const savedConversation = await withConnection(async (db) => {
                    const [conversation] = await db.insert(qaConversations).values({
                        knowledgeBaseId,
                        userId: user.id,
                        question,
                        answer: result.answer,
                        sources: result.sources || [],
                        responseTime,
                        confidence: result.confidence
                    }).returning();
                    return conversation;
                });

                logger.info('问答记录已保存', {
                    conversationId: savedConversation.id,
                    knowledgeBaseId,
                    questionType: classification.type
                });
            } catch (dbError) {
                logger.error('保存问答记录失败', {error: dbError});
                // 不阻断响应，继续返回答案
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: `qa-${Date.now()}`,
                    answer: result.answer,
                    sources: result.sources || [],
                    confidence: result.confidence,
                    responseTime,
                    method: result.method,
                    questionType: classification.type
                }
            });

        } catch (error) {
            logger.error('问题处理失败', {error, questionType: classification.type});
            
            // 提供友好的错误回复
            const errorAnswer = '抱歉，我遇到了一些技术问题。请稍后重试，或者您可以尝试：\n• 重新表达您的问题\n• 查看项目文档\n• 联系技术支持';
            
            return NextResponse.json({
                success: true,
                data: {
                    id: `qa-error-${Date.now()}`,
                    answer: errorAnswer,
                    sources: [],
                    confidence: 0.1,
                    responseTime: (Date.now() - startTime) / 1000,
                    method: 'error_handling'
                }
            });
        }
    } catch (error) {
        logger.error('知识库问答请求处理失败', {error});
        return NextResponse.json({error: '服务器内部错误，请稍后重试'}, {status: 500});
    }
}