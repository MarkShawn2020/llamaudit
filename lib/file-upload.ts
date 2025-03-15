import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';

const unlinkAsync = promisify(fs.unlink);

// 基本存储目录配置
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
// 设置支持的文档类型并定义适当的类型
const DOC_TYPES: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
};

// 确保上传目录存在
export async function ensureUploadDirs() {
    try {
        await mkdir(UPLOAD_DIR, { recursive: true });
        await mkdir(path.join(UPLOAD_DIR, 'organizations'), { recursive: true });
    } catch (error) {
        console.error('Error creating upload directories:', error);
    }
}

// 根据组织ID创建目录结构
export async function ensureOrganizationDirs(organizationId: number) {
    try {
        const orgDir = path.join(UPLOAD_DIR, 'organizations', organizationId.toString());
        await mkdir(orgDir, { recursive: true });

        // 创建不同类型的文档目录
        await mkdir(path.join(orgDir, 'meeting_minutes'), { recursive: true });
        await mkdir(path.join(orgDir, 'contracts'), { recursive: true });
        await mkdir(path.join(orgDir, 'attachments'), { recursive: true });

        return true;
    } catch (error) {
        console.error(`Error creating directories for organization ${organizationId}:`, error);
        return false;
    }
}

// 根据文档类型获取存储路径
function getDocumentPath(organizationId: number, documentType: string, fileName: string) {
    const orgDir = path.join(UPLOAD_DIR, 'organizations', organizationId.toString());

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

    return path.join(orgDir, docTypeDir, fileName);
}

// 保存上传的文件
export async function saveUploadedFile(
    file: { name: string; type: string; data: Buffer },
    organizationId: number,
    documentType: string
) {
    try {
        // 确保目录存在
        await ensureOrganizationDirs(organizationId);

        // 生成唯一文件名，使用类型安全的访问方式
        const extension = file.type in DOC_TYPES ? DOC_TYPES[file.type] : 'unknown';
        const uniqueFileName = `${randomUUID()}.${extension}`;

        // 获取存储路径
        const filePath = getDocumentPath(organizationId, documentType, uniqueFileName);

        // 写入文件
        await writeFile(filePath, file.data);

        return {
            success: true,
            fileName: uniqueFileName,
            originalName: file.name,
            mimetype: file.type,
            path: filePath,
            relativePath: path.relative(process.cwd(), filePath),
        };
    } catch (error) {
        console.error('Error saving uploaded file:', error);
        return {
            success: false,
            error: 'Failed to save file',
        };
    }
}

// 删除文件
export async function deleteFile(filePath: string) {
    try {
        // 检查是否为相对路径，如果是则转换为绝对路径
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);

        await unlinkAsync(absolutePath);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

// 读取文件内容
export async function readFileContent(filePath: string): Promise<string | null> {
    try {
        // 检查是否为相对路径，如果是则转换为绝对路径
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);

        // 目前只支持文本文件读取，后续可扩展为支持 docx 和 pdf
        const content = await fs.promises.readFile(absolutePath, 'utf8');
        return content;
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

// 初始化上传目录
ensureUploadDirs().catch(console.error); 
