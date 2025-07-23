/**
 * 项目Dify配置管理API
 * 支持用户自定义配置Dify API Base URL和Dataset API Key
 */

import {NextRequest, NextResponse} from 'next/server';
import {getUser} from '@/lib/db/queries';
import {db} from '@/lib/db/drizzle';
import {auditUnits} from '@/lib/db/schema';
import {eq} from 'drizzle-orm';
import {decryptApiKey, encryptApiKey, maskSensitiveData} from '@/lib/crypto';

interface DifyConfigRequest {
    difyBaseUrl: string;
    difyDatasetApiKey: string;
}

interface DifyConfigResponse {
    difyBaseUrl: string;
    difyDatasetApiKey?: string; // 在响应中掩码显示
    hasApiKey: boolean;
    lastUpdated?: string;
}

/**
 * 获取项目Dify配置
 */
export async function GET(
    request: NextRequest,
    {params}: { params: { projectId: string } }
) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({error: '未授权访问'}, {status: 401});
        }

        const {projectId} = params;
        if (!projectId) {
            return NextResponse.json({error: '项目ID不能为空'}, {status: 400});
        }

        // 获取项目信息和Dify配置
        const project = await db.query.auditUnits.findFirst({
            where: eq(auditUnits.id, projectId),
            columns: {
                id: true,
                name: true,
                difyBaseUrl: true,
                difyDatasetApiKey: true,
                difyConfigUpdatedAt: true,
                createdBy: true
            }
        });

        if (!project) {
            return NextResponse.json({error: '项目不存在'}, {status: 404});
        }

        // 权限检查：只有项目创建者可以访问配置
        if (project.createdBy !== user.id) {
            return NextResponse.json({error: '无权限访问此项目配置'}, {status: 403});
        }

        // 构建响应数据（不返回明文API密钥）
        const response: DifyConfigResponse = {
            difyBaseUrl: project.difyBaseUrl || 'https://api.dify.ai/v1',
            hasApiKey: !!project.difyDatasetApiKey,
            lastUpdated: project.difyConfigUpdatedAt?.toISOString()
        };

        // 如果有API密钥，返回掩码版本
        if (project.difyDatasetApiKey) {
            try {
                const decryptedKey = decryptApiKey(project.difyDatasetApiKey);
                response.difyDatasetApiKey = maskSensitiveData(decryptedKey);
            } catch (error) {
                console.error('解密API密钥失败:', error);
                response.difyDatasetApiKey = '***[解密失败]***';
            }
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('获取Dify配置失败:', error);
        return NextResponse.json(
            {error: '获取配置失败'},
            {status: 500}
        );
    }
}

/**
 * 更新项目Dify配置
 */
export async function PUT(
    request: NextRequest,
    {params}: { params: { projectId: string } }
) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({error: '未授权访问'}, {status: 401});
        }

        const {projectId} = params;
        if (!projectId) {
            return NextResponse.json({error: '项目ID不能为空'}, {status: 400});
        }

        const body: DifyConfigRequest = await request.json();
        const {difyBaseUrl, difyDatasetApiKey} = body;

        // 参数验证
        if (!difyBaseUrl || !difyBaseUrl.trim()) {
            return NextResponse.json({error: 'Dify Base URL不能为空'}, {status: 400});
        }

        if (!difyDatasetApiKey || !difyDatasetApiKey.trim().startsWith("dataset")) {
            return NextResponse.json({error: 'Invalid Dify Dataset API Key'}, {status: 400});
        }

        // URL格式验证
        try {
            new URL(difyBaseUrl);
        } catch {
            return NextResponse.json({error: 'Dify Base URL格式无效'}, {status: 400});
        }

        // 获取项目信息
        const project = await db.query.auditUnits.findFirst({
            where: eq(auditUnits.id, projectId),
            columns: {
                id: true,
                createdBy: true
            }
        });

        if (!project) {
            return NextResponse.json({error: '项目不存在'}, {status: 404});
        }

        // 权限检查
        if (project.createdBy !== user.id) {
            return NextResponse.json({error: '无权限修改此项目配置'}, {status: 403});
        }

        // 加密API密钥
        let encryptedApiKey: string;
        try {
            encryptedApiKey = encryptApiKey(difyDatasetApiKey.trim());
        } catch (error) {
            console.error('API密钥加密失败:', error);
            return NextResponse.json({error: 'API密钥处理失败'}, {status: 500});
        }

        // 更新配置
        await db.update(auditUnits)
            .set({
                difyBaseUrl: difyBaseUrl.trim(),
                difyDatasetApiKey: encryptedApiKey,
                difyConfigUpdatedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(auditUnits.id, projectId));

        console.log(`✅ 项目[${projectId}]Dify配置已更新:`, {
            projectId,
            difyBaseUrl: difyBaseUrl.trim(),
            apiKeyMask: maskSensitiveData(difyDatasetApiKey),
            updatedBy: user.id
        });

        // 返回更新后的配置（不包含明文密钥）
        const response: DifyConfigResponse = {
            difyBaseUrl: difyBaseUrl.trim(),
            difyDatasetApiKey: maskSensitiveData(difyDatasetApiKey),
            hasApiKey: true,
            lastUpdated: new Date().toISOString()
        };

        return NextResponse.json({
            message: 'Dify配置更新成功',
            config: response
        });

    } catch (error) {
        console.error('更新Dify配置失败:', error);
        return NextResponse.json(
            {error: '更新配置失败'},
            {status: 500}
        );
    }
}

/**
 * 测试Dify配置有效性
 */
export async function POST(
    request: NextRequest,
    {params}: { params: { projectId: string } }
) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({error: '未授权访问'}, {status: 401});
        }

        const {projectId} = params;
        if (!projectId) {
            return NextResponse.json({error: '项目ID不能为空'}, {status: 400});
        }

        const body = await request.json();
        const {difyBaseUrl, difyDatasetApiKey, datasetId} = body;

        // 参数验证
        if (!difyBaseUrl || !difyDatasetApiKey) {
            return NextResponse.json({error: '配置参数不完整'}, {status: 400});
        }

        if (!datasetId) {
            return NextResponse.json({error: '数据集ID不能为空'}, {status: 400});
        }

        // 权限检查
        const project = await db.query.auditUnits.findFirst({
            where: eq(auditUnits.id, projectId),
            columns: {createdBy: true}
        });

        if (!project || project.createdBy !== user.id) {
            return NextResponse.json({error: '无权限测试此项目配置'}, {status: 403});
        }

        console.log(`🧪 测试项目[${projectId}]Dify配置:`, {
            difyBaseUrl,
            datasetId,
            apiKeyMask: maskSensitiveData(difyDatasetApiKey)
        });

        // 测试API连通性
        const testUrl = `${difyBaseUrl}/datasets/${datasetId}/retrieve`;
        const testResponse = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${difyDatasetApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'test connection',
                retrieval_model: {
                    search_method: 'semantic_search',
                    top_k: 1,
                    score_threshold: 0.1
                }
            }),
            signal: AbortSignal.timeout(10000) // 10秒超时
        });

        const isSuccess = testResponse.ok;
        let errorMessage = '';

        if (!isSuccess) {
            const errorData = await testResponse.json().catch(() => ({}));
            errorMessage = errorData.message || errorData.error || `HTTP ${testResponse.status}`;
        }

        console.log(`${isSuccess ? '✅' : '❌'} Dify配置测试结果:`, {
            projectId,
            success: isSuccess,
            status: testResponse.status,
            error: errorMessage
        });

        return NextResponse.json({
            success: isSuccess,
            status: testResponse.status,
            message: isSuccess ? 'Dify配置测试成功' : 'Dify配置测试失败',
            error: errorMessage || undefined
        });

    } catch (error) {
        console.error('Dify配置测试失败:', error);

        const errorMessage = error instanceof Error ? error.message : '测试失败';

        return NextResponse.json({
            success: false,
            message: 'Dify配置测试失败',
            error: errorMessage
        }, {status: 500});
    }
}

/**
 * 删除项目Dify配置
 */
export async function DELETE(
    request: NextRequest,
    {params}: { params: { projectId: string } }
) {
    try {
        const user = await getUser();
        if (!user) {
            return NextResponse.json({error: '未授权访问'}, {status: 401});
        }

        const {projectId} = params;
        if (!projectId) {
            return NextResponse.json({error: '项目ID不能为空'}, {status: 400});
        }

        // 权限检查
        const project = await db.query.auditUnits.findFirst({
            where: eq(auditUnits.id, projectId),
            columns: {createdBy: true}
        });

        if (!project) {
            return NextResponse.json({error: '项目不存在'}, {status: 404});
        }

        if (project.createdBy !== user.id) {
            return NextResponse.json({error: '无权限删除此项目配置'}, {status: 403});
        }

        // 清除Dify配置
        await db.update(auditUnits)
            .set({
                difyBaseUrl: 'https://api.dify.ai/v1', // 重置为默认值
                difyDatasetApiKey: null,
                difyConfigUpdatedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(auditUnits.id, projectId));

        console.log(`🗑️ 项目[${projectId}]Dify配置已删除`);

        return NextResponse.json({
            message: 'Dify配置已删除'
        });

    } catch (error) {
        console.error('删除Dify配置失败:', error);
        return NextResponse.json(
            {error: '删除配置失败'},
            {status: 500}
        );
    }
}