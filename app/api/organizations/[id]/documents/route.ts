import { NextResponse } from 'next/server';
import {
    getOrganizationById,
    createDocument,
    getDocuments,
    getDocumentTypeById
} from '@/lib/db/audit-queries';
import { saveUploadedFile } from '@/lib/file-upload';

// 临时的认证逻辑，后续会替换为项目的实际认证系统
async function getSessionInfo() {
    // 这里应该实现你的认证逻辑
    // 此处为了演示，返回模拟数据
    return {
        success: true,
        userId: 1,
        teamId: 1
    };
}

// 获取组织下的文档列表
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getSessionInfo();

        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = authResult;
        const organizationId = parseInt(params.id, 10);

        // 确认组织存在并属于当前团队
        const organization = await getOrganizationById(organizationId, teamId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // 获取查询参数
        const { searchParams } = new URL(request.url);
        const documentTypeId = searchParams.get('documentTypeId')
            ? parseInt(searchParams.get('documentTypeId') as string, 10)
            : undefined;
        const extractedInfo = searchParams.get('extractedInfo')
            ? searchParams.get('extractedInfo') === 'true'
            : undefined;

        // 获取文档列表
        const documents = await getDocuments(teamId, {
            organizationId,
            documentTypeId,
            extractedInfo,
        });

        return NextResponse.json({
            success: true,
            data: documents
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// 上传新文档
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await getSessionInfo();

        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, teamId } = authResult;
        const organizationId = parseInt(params.id, 10);

        // 确认组织存在并属于当前团队
        const organization = await getOrganizationById(organizationId, teamId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // 处理表单数据
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const documentTypeIdValue = formData.get('documentTypeId');
        if (!documentTypeIdValue) {
            return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
        }

        const documentTypeId = parseInt(documentTypeIdValue as string, 10);
        const documentName = formData.get('name') ? String(formData.get('name')) : file.name;

        // 验证文档类型
        const documentType = await getDocumentTypeById(documentTypeId);
        if (!documentType) {
            return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
        }

        // 确定文档类型的分类
        let documentCategory;
        if (documentType.name.includes('会议') || documentType.name.includes('纪要')) {
            documentCategory = 'meeting_minutes';
        } else if (documentType.name.includes('合同')) {
            documentCategory = 'contract';
        } else {
            documentCategory = 'attachment';
        }

        // 读取文件内容为Buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // 保存文件
        const saveResult = await saveUploadedFile(
            {
                name: file.name,
                type: file.type,
                data: fileBuffer,
            },
            organizationId,
            documentCategory
        );

        if (!saveResult.success) {
            return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
        }

        // 创建文档记录
        const document = await createDocument({
            name: documentName,
            filePath: saveResult.relativePath,
            fileType: file.type,
            documentTypeId,
            organizationId,
            uploadedBy: userId,
            teamId,
        });

        return NextResponse.json({
            success: true,
            data: {
                document: document[0],
                fileInfo: saveResult
            }
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 
