import { withConnection } from '@/lib/db';
import { createDocument } from '@/lib/db/audit-queries';
import { getUser } from '@/lib/db/queries';
import { createStorage } from '@/lib/file-storage';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// 文档类型映射
const DOCUMENT_TYPES = {
    'meeting': 1,  // 会议纪要
    'contract': 2, // 合同
    'attachment': 3 // 附件
};

// 创建存储服务实例
const storage = createStorage();

export async function POST(request: NextRequest) {
    return withConnection(async () => {
        try {
            // 检查用户认证
            const user = await getUser();
            if (!user) {
                return NextResponse.json({ error: '未授权访问' }, { status: 401 });
            }

            // 获取表单数据
            const formData = await request.formData();
            const files = formData.getAll('files') as File[];
            const orgIdStr = formData.get('organizationId') as string;
            const documentType = formData.get('documentType') as string;
            const teamIdStr = formData.get('teamId') as string;

            // 验证必要参数
            if (!files.length || !orgIdStr || !documentType || !teamIdStr) {
                return NextResponse.json(
                    { error: '缺少必要参数' },
                    { status: 400 }
                );
            }

            // 转换ID为数字
            const orgId = parseInt(orgIdStr, 10);
            const teamId = parseInt(teamIdStr, 10);
            if (isNaN(orgId) || isNaN(teamId)) {
                return NextResponse.json(
                    { error: '无效的组织ID或团队ID' },
                    { status: 400 }
                );
            }

            const documentIds: string[] = [];
            const savedFiles: Array<{ id: string; name: string; path: string; type: string; url: string }> = [];

            for (const file of files) {
                try {
                    // 生成唯一文件ID
                    const fileId = randomUUID();
                    
                    // 使用统一存储服务上传文件
                    const uploadResult = await storage.uploadFile(file, fileId);
                    
                    // 创建文档数据库记录
                    const document = await createDocument({
                        name: file.name,
                        filePath: uploadResult.path,
                        fileType: file.type,
                        documentTypeId: DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] || 1,
                        organizationId: orgId,
                        uploadedBy: user.id,
                        teamId: teamId,
                    });
                    
                    // 将数字ID转换为字符串
                    const documentId = document[0].id.toString();
                    documentIds.push(documentId);
                    savedFiles.push({
                        id: documentId,
                        name: file.name,
                        path: uploadResult.path,
                        type: file.type,
                        url: uploadResult.url
                    });
                } catch (fileError) {
                    console.error('处理文件时出错:', fileError);
                    throw fileError;
                }
            }

            // 返回成功响应
            return NextResponse.json({
                success: true,
                message: '文件上传成功',
                documentIds,
                totalFiles: savedFiles.length,
                files: savedFiles
            });

        } catch (error) {
            console.error('文档上传错误:', error);
            return NextResponse.json(
                { error: '文档上传失败' },
                { status: 500 }
            );
        }
    });
} 
