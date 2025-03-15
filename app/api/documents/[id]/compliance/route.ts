import { NextResponse } from 'next/server';
import {
    getDocumentById,
    getComplianceRuleById,
    createComplianceCheck
} from '@/lib/db/audit-queries';
import { readFileContent } from '@/lib/file-upload';
import { checkCompliance } from '@/lib/ai/deepseek';

// 临时的认证逻辑
async function getSessionInfo() {
    return {
        success: true,
        userId: 1,
        teamId: 1
    };
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getSessionInfo();

        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = authResult;
        const documentId = parseInt(params.id, 10);

        // 获取文档信息
        const documentInfo = await getDocumentById(documentId, teamId);
        if (!documentInfo) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // 获取文档内容
        const filePath = documentInfo.document.filePath;
        const fileContent = await readFileContent(filePath);

        if (!fileContent) {
            return NextResponse.json({ error: 'Failed to read document content' }, { status: 500 });
        }

        // 解析请求体
        const body = await request.json();

        if (!body.ruleId) {
            return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
        }

        const ruleId = parseInt(body.ruleId, 10);

        // 获取规则信息
        const ruleInfo = await getComplianceRuleById(ruleId, teamId);
        if (!ruleInfo) {
            return NextResponse.json({ error: 'Compliance rule not found' }, { status: 404 });
        }

        // 检查合规性
        const checkResult = await checkCompliance(fileContent, {
            name: ruleInfo.rule.name,
            description: ruleInfo.rule.description || '',
            config: ruleInfo.rule.ruleConfig
        });

        if (!checkResult.success) {
            return NextResponse.json(
                { error: 'Failed to check compliance', details: checkResult.error },
                { status: 500 }
            );
        }

        // 保存检查结果
        const complianceCheck = await createComplianceCheck({
            documentId,
            ruleId,
            passed: checkResult.passed,
            details: checkResult.details || ''
        });

        return NextResponse.json({
            success: true,
            data: {
                check: complianceCheck[0],
                reasoning: checkResult.reasoningContent
            }
        });
    } catch (error) {
        console.error('Error checking compliance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 
