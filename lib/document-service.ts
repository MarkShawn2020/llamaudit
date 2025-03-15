/**
 * 文档上传和管理服务
 */

/**
 * 上传文档文件
 * @param files 文件数组
 * @param organizationId 组织ID
 * @param documentType 文档类型
 * @returns 上传结果
 */
export async function uploadDocuments(
    files: File[],
    organizationId: string,
    documentType: string
): Promise<{ success: boolean; message: string; documentIds?: string[] }> {
    try {
        // 创建FormData对象
        const formData = new FormData();

        // 添加文件到FormData
        files.forEach((file) => {
            formData.append('files', file);
        });

        // 添加其他参数
        formData.append('organizationId', organizationId);
        formData.append('documentType', documentType);

        // 发送API请求
        const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`上传失败: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            success: true,
            message: '上传成功',
            documentIds: result.documentIds,
        };
    } catch (error) {
        console.error('文档上传错误:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '上传过程中发生未知错误',
        };
    }
}

/**
 * 根据ID获取文档
 * @param documentId 文档ID
 * @returns 文档数据
 */
export async function getDocumentById(documentId: string) {
    try {
        const response = await fetch(`/api/documents/${documentId}`);

        if (!response.ok) {
            throw new Error(`获取文档失败: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取文档错误:', error);
        throw error;
    }
}

/**
 * 获取文档列表
 * @param params 查询参数
 * @returns 文档列表
 */
export async function getDocuments(params: {
    organizationId?: string;
    documentType?: string;
    page?: number;
    limit?: number;
}) {
    try {
        // 构建查询参数
        const queryParams = new URLSearchParams();

        if (params.organizationId) {
            queryParams.append('organizationId', params.organizationId);
        }

        if (params.documentType) {
            queryParams.append('documentType', params.documentType);
        }

        if (params.page) {
            queryParams.append('page', params.page.toString());
        }

        if (params.limit) {
            queryParams.append('limit', params.limit.toString());
        }

        // 使用合适的API端点获取文档列表
        const response = await fetch(`/api/documents?${queryParams.toString()}`);

        if (!response.ok) {
            throw new Error(`获取文档列表失败: ${response.statusText}`);
        }

        const result = await response.json();
        
        return {
            success: true,
            data: result.data || [],
            totalCount: result.totalCount || 0,
            page: result.page || 1
        };
    } catch (error) {
        console.error('获取文档列表错误:', error);
        return {
            success: false,
            data: [],
            message: error instanceof Error ? error.message : '获取文档列表时发生未知错误'
        };
    }
} 
