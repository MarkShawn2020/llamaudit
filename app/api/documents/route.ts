import { getDocuments } from '@/lib/db/audit-queries';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { withConnection } from '@/lib/db/utils';
import { NextRequest, NextResponse } from 'next/server';

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
            
            // 安全解析整数参数
            const safeParseInt = (value: string | null): number | undefined => {
                if (!value) return undefined;
                const num = parseInt(value);
                return isNaN(num) ? undefined : num;
            };
            
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