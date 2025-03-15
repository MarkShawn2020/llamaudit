import { NextResponse } from 'next/server';
import { documentQA } from '@/lib/ai/deepseek';
import { getDocumentById } from '@/lib/db/audit-queries';
import { readFileContent } from '@/lib/file-upload';

// 临时的认证逻辑
async function getSessionInfo() {
    return {
        success: true,
        userId: 1,
        teamId: 1
    };
}

export async function POST(request: Request) {
    try {
        const authResult = await getSessionInfo();

        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = authResult;
        const body = await request.json();

        // 验证请求
        if (!body.question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        let context = '';

        // 如果提供了文档ID，加载该文档内容作为上下文
        if (body.documentIds && Array.isArray(body.documentIds) && body.documentIds.length > 0) {
            // 获取所有指定文档的内容作为上下文
            const documentsPromises = body.documentIds.map(async (id: number) => {
                const documentInfo = await getDocumentById(id, teamId);
                if (documentInfo) {
                    const fileContent = await readFileContent(documentInfo.document.filePath);
                    return fileContent || '';
                }
                return '';
            });

            const documentContents = await Promise.all(documentsPromises);
            context = documentContents.join('\n\n--- 文档分隔线 ---\n\n');
        } else if (body.context) {
            // 使用请求中提供的上下文
            context = body.context;
        } else {
            return NextResponse.json({ error: 'Either documentIds or context is required' }, { status: 400 });
        }

        // 调用AI模型进行问答
        const result = await documentQA(body.question, context);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to process question', details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                answer: result.answer,
                reasoning: result.reasoningContent
            }
        });
    } catch (error) {
        console.error('Error in document QA:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 
