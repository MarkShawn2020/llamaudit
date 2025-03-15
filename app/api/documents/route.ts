import { createDocument, getDocuments, getDocumentTypeById } from '@/lib/db/audit-queries';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { withConnection } from '@/lib/db/utils';
import { saveUploadedFile } from '@/lib/file-upload';
import { NextRequest, NextResponse } from 'next/server';

// 安全解析整数参数
const safeParseInt = (value: string | null): number | undefined => {
    if (!value) return undefined;
    const num = parseInt(value);
    return isNaN(num) ? undefined : num;
};

// 获取文档列表
export async function GET(request: NextRequest) {
    return withConnection(async () => {
        try {
            // 检查用户认证
            const user = await getUser();
            if (!user) {
                return NextResponse.json({ error: '未授权访问' }, { status: 401 });
            }

            // 获取用户团队信息
            const userWithTeam = await getUserWithTeam(user.id);
            if (!userWithTeam || !userWithTeam.teamId) {
                return NextResponse.json({ error: '用户未关联团队' }, { status: 403 });
            }

            const teamId = userWithTeam.teamId;

            // 获取查询参数
            const { searchParams } = new URL(request.url);
            
            
            const organizationId = safeParseInt(searchParams.get('organizationId'));
            const documentTypeId = safeParseInt(searchParams.get('documentType'));
            const page = safeParseInt(searchParams.get('page')) || 1;
            const limit = safeParseInt(searchParams.get('limit')) || 20;

            // 获取文档列表
            const documents = await getDocuments(
                teamId,
                {
                    organizationId,
                    documentTypeId
                }
            );

            // 处理结果，确保返回统一的文档格式
            const processedDocuments = documents.map(doc => ({
                id: doc.document.id.toString(),
                name: doc.document.name,
                organizationName: doc.organization.name,
                documentType: doc.documentType.name,
                uploadedAt: doc.document.uploadedAt.toISOString(),
                extractedInfo: doc.document.extractedInfo,
                uploadedBy: `${doc.uploader.name || ''} (${doc.uploader.email})`,
                filePath: doc.document.filePath,
            }));

            // 计算分页
            const startIdx = (page - 1) * limit;
            const endIdx = startIdx + limit;
            const paginatedDocuments = processedDocuments.slice(startIdx, endIdx);
            
            return NextResponse.json({
                success: true,
                data: paginatedDocuments,
                totalCount: processedDocuments.length,
                page,
                limit,
            });
        } catch (error) {
            console.error('Error fetching documents:', error);
            return NextResponse.json(
                { error: '获取文档列表失败', details: error instanceof Error ? error.message : undefined }, 
                { status: 500 }
            );
        }
    });
} 


// 上传新文档
export async function POST(
    request: NextRequest
) {
    try {
            // 检查用户认证
            const user = await getUser();
            if (!user) {
                return NextResponse.json({ error: '未授权访问' }, { status: 401 });
            }

            // 获取用户团队信息
            const userWithTeam = await getUserWithTeam(user.id);
            if (!userWithTeam || !userWithTeam.teamId) {
                return NextResponse.json({ error: '用户未关联团队' }, { status: 403 });
            }

            const teamId = userWithTeam.teamId;

        // 处理表单数据
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const documentTypeIdRaw = formData.get('documentTypeId');
        const documentNameRaw = formData.get('name');
        const documentName = documentNameRaw ? String(documentNameRaw) : file.name;

        const organizationId = formData.get('organizationId');
        if(!organizationId) {
            return NextResponse.json({ error: 'No organization ID provided' }, { status: 400 });
        }
        

        // 验证并转换 documentTypeId
        const documentTypeId = Number(documentTypeIdRaw);
        if (!documentTypeIdRaw || isNaN(documentTypeId)) {
            return NextResponse.json({ error: 'Invalid document type ID' }, { status: 400 });
        }

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
            filePath: saveResult.relativePath!, // todo: oss path
            fileType: file.type,
            documentTypeId,
            organizationId,
            uploadedBy: user.id,
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
