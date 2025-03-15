import OSS from 'ali-oss';
import { randomUUID } from 'crypto';

// OSS 客户端配置
const ossClient = new OSS({
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
});

// 支持的文档类型配置
const DOC_TYPES: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
};

// 获取 OSS 存储路径
function getOssPath(organizationId: number, documentType: string, fileName: string) {
    let docTypeDir;
    switch (documentType) {
        case 'meeting_minutes':
            docTypeDir = 'meeting_minutes';
            break;
        case 'contract':
            docTypeDir = 'contracts';
            break;
        default:
            docTypeDir = 'attachments';
    }

    return `organizations/${organizationId}/${docTypeDir}/${fileName}`;
}

// 保存文件到 OSS
export async function saveUploadedFile(
    file: { name: string; type: string; data: Buffer },
    organizationId: number,
    documentType: string
) {
    try {
        // 生成唯一文件名
        const extension = file.type in DOC_TYPES ? DOC_TYPES[file.type] : 'unknown';
        const uniqueFileName = `${randomUUID()}.${extension}`;

        // 获取 OSS 存储路径
        const ossPath = getOssPath(organizationId, documentType, uniqueFileName);

        // 上传到 OSS
        const result = await ossClient.put(ossPath, file.data);

        return {
            success: true,
            fileName: uniqueFileName,
            originalName: file.name,
            mimetype: file.type,
            url: result.url, // OSS 文件访问地址
            ossPath: ossPath,
        };
    } catch (error) {
        console.error('Error uploading file to OSS:', error);
        return {
            success: false,
            error: 'Failed to upload file to OSS',
        };
    }
}

// 从 OSS 删除文件
export async function deleteFile(ossPath: string) {
    try {
        await ossClient.delete(ossPath);
        return true;
    } catch (error) {
        console.error('Error deleting file from OSS:', error);
        return false;
    }
}

// 读取 OSS 文件内容
export async function readFileContent(ossPath: string): Promise<string | null> {
    try {
        const result = await ossClient.get(ossPath);
        return result.content.toString('utf8');
    } catch (error) {
        console.error('Error reading file from OSS:', error);
        return null;
    }
} 
