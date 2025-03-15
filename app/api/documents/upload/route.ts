import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    // 检查用户认证
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

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

        if (!documentType) {
            return NextResponse.json({ error: '未提供文档类型' }, { status: 400 });
        }

        // 处理文件上传
        // 这里应该是实际的文件处理逻辑，例如保存到文件系统或云存储
        // 并将文件信息保存到数据库中

        // 模拟文件上传成功，生成随机文档ID
        const documentIds = files.map(() => 'doc_' + Math.random().toString(36).substr(2, 9));

        // 返回成功响应
        return NextResponse.json({
            success: true,
            message: '文件上传成功',
            documentIds,
            totalFiles: files.length
        });

    } catch (error) {
        console.error('文件上传出错:', error);
        return NextResponse.json(
            { error: '文件上传处理过程中发生错误' },
            { status: 500 }
        );
    }
} 
