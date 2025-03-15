import { createDocument } from '@/lib/db/audit-queries';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { withConnection } from '@/lib/db/utils';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

// 文件类型映射
const FILE_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc'
};

// 文档类型映射
const DOCUMENT_TYPES = {
    'meeting': 1,  // 会议纪要
    'contract': 2, // 合同
    'attachment': 3 // 附件
};

// 确保上传目录存在
function ensureUploadDir() {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
}

export async function POST(request: NextRequest) {
    return withConnection(async () => {
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

        try {
            // 获取表单数据
            const formData = await request.formData();

            // 获取上传的文件
            const files = formData.getAll('files') as File[];
            if (!files || files.length === 0) {
                return NextResponse.json({ error: '未提供文件' }, { status: 400 });
            }

            // 获取其他参数
            const organizationId = formData.get('organizationId') as string;
            const documentType = formData.get('documentType') as string;

            if (!organizationId) {
                return NextResponse.json({ error: '未提供组织ID' }, { status: 400 });
            }

            // 验证organizationId是有效数字
            const orgId = parseInt(organizationId);
            if (isNaN(orgId)) {
                return NextResponse.json({ error: '组织ID格式无效' }, { status: 400 });
            }

            if (!documentType) {
                return NextResponse.json({ error: '未提供文档类型' }, { status: 400 });
            }

            // 确保上传目录存在
            const uploadDir = ensureUploadDir();
            
            // 保存文件并创建文档记录
            const documentIds = [];
            const savedFiles = [];

            for (const file of files) {
                try {
                    // 获取文件内容
                    const fileBuffer = await file.arrayBuffer();
                    
                    // 生成唯一文件名
                    const fileType = FILE_TYPES[file.type as keyof typeof FILE_TYPES] || 'unknown';
                    const uniqueFileName = `${randomUUID()}.${fileType}`;
                    
                    // 构建文件路径
                    const filePath = path.join(uploadDir, uniqueFileName);
                    
                    // 写入文件
                    fs.writeFileSync(filePath, Buffer.from(fileBuffer));
                    
                    // 创建文档数据库记录
                    const document = await createDocument({
                        name: file.name,
                        filePath: filePath,
                        fileType: file.type,
                        documentTypeId: DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] || 1,
                        organizationId: orgId,
                        uploadedBy: user.id,
                        teamId: teamId,
                    });
                    
                    documentIds.push(document[0].id);
                    savedFiles.push({
                        id: document[0].id,
                        name: file.name,
                        path: filePath,
                        type: file.type,
                    });
                } catch (fileError) {
                    console.error('处理文件时出错:', fileError);
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
            console.error('文件上传出错:', error);
            return NextResponse.json(
                { error: '文件上传处理过程中发生错误' },
                { status: 500 }
            );
        }
    });
} 
