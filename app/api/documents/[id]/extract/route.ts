import { NextResponse } from 'next/server';
import {
    getDocumentById,
    updateDocumentExtractedStatus,
    createMeetingMinutes,
    createContract
} from '@/lib/db/audit-queries';
import { readFileContent } from '@/lib/file-upload';
import { extractMeetingInfo, extractContractInfo } from '@/lib/ai/deepseek';
import path from 'path';

// 临时的认证逻辑，后续会替换为项目的实际认证系统
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

        // 根据文档类型进行信息提取
        const documentTypeName = documentInfo.documentType.name.toLowerCase();
        let extractionResult;

        if (documentTypeName.includes('会议') || documentTypeName.includes('纪要')) {
            // 提取会议纪要信息
            const result = await extractMeetingInfo(fileContent);
            if (!result.success) {
                return NextResponse.json(
                    { error: 'Failed to extract meeting information', details: result.error },
                    { status: 500 }
                );
            }

            // 保存提取的信息
            const meetingData = result.data;
            const meetingMinutesRecord = await createMeetingMinutes({
                documentId,
                meetingDate: meetingData.meetingDate ? new Date(meetingData.meetingDate) : undefined,
                documentNumber: meetingData.documentNumber,
                meetingTopic: meetingData.meetingTopic,
                meetingConclusion: meetingData.meetingConclusion,
                contentSummary: meetingData.contentSummary,
                eventType: meetingData.eventType,
                eventDetails: meetingData.eventDetails,
                involvedAmount: meetingData.involvedAmount ? parseFloat(meetingData.involvedAmount) : undefined,
                relatedDepartments: meetingData.relatedDepartments,
                relatedPersonnel: meetingData.relatedPersonnel,
                decisionBasis: meetingData.decisionBasis,
                originalText: fileContent.substring(0, 10000) // 截取前10000个字符
            });

            extractionResult = {
                type: 'meeting_minutes',
                data: meetingMinutesRecord[0],
                reasoning: result.reasoningContent
            };
        } else if (documentTypeName.includes('合同')) {
            // 提取合同信息
            const result = await extractContractInfo(fileContent);
            if (!result.success) {
                return NextResponse.json(
                    { error: 'Failed to extract contract information', details: result.error },
                    { status: 500 }
                );
            }

            // 保存提取的信息
            const contractData = result.data;
            const contractRecord = await createContract({
                documentId,
                contractNumber: contractData.contractNumber,
                signingDate: contractData.signingDate ? new Date(contractData.signingDate) : undefined,
                contractName: contractData.contractName,
                partyA: contractData.partyA,
                partyB: contractData.partyB,
                amountWithTax: contractData.amountWithTax ? parseFloat(contractData.amountWithTax) : undefined,
                amountWithoutTax: contractData.amountWithoutTax ? parseFloat(contractData.amountWithoutTax) : undefined,
                paymentTerms: contractData.paymentTerms,
                performancePeriod: contractData.performancePeriod,
                obligations: contractData.obligations,
                acceptanceCriteria: contractData.acceptanceCriteria,
                liabilityForBreach: contractData.liabilityForBreach
            });

            extractionResult = {
                type: 'contract',
                data: contractRecord[0],
                reasoning: result.reasoningContent
            };
        } else {
            return NextResponse.json(
                { error: 'Unsupported document type for extraction' },
                { status: 400 }
            );
        }

        // 更新文档的提取状态
        await updateDocumentExtractedStatus(documentId, teamId, true);

        return NextResponse.json({
            success: true,
            data: extractionResult
        });
    } catch (error) {
        console.error('Error extracting document information:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 
