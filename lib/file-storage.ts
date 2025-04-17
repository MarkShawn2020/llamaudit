/**
 * 文件存储服务
 * 负责文件的上传、下载和管理
 * 支持本地文件系统和阿里云OSS
 */
import OSS from 'ali-oss';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// 文件类型映射
export const FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc'
};

// 存储提供者枚举
export enum StorageProvider {
  LOCAL = 'local',
  ALIYUN_OSS = 'aliyun_oss'
}

// 文件存储结果接口
export interface FileStorageResult {
  id: string;
  name: string;
  path: string;
  url: string;
  provider: StorageProvider;
}

/**
 * 文件存储接口
 */
export interface FileStorage {
  /**
   * 上传文件
   * @param file 文件对象
   * @param fileId 可选的文件ID
   * @returns 文件存储结果
   */
  uploadFile(file: File, fileId?: string): Promise<FileStorageResult>;

  /**
   * 删除文件
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 是否删除成功
   */
  deleteFile(fileId: string, filePath: string): Promise<boolean>;

  /**
   * 获取文件URL
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 文件URL
   */
  getFileUrl(fileId: string, filePath: string): string;
}

// 以下代码与drizzle.ts中的模式相匹配，确保连接管理一致
const globalForStorage = global as unknown as {
  ossClient: OSS | undefined;
  fileStorage: FileStorage | undefined;
};

// DEBUG标记
const DEBUG = process.env.NODE_ENV !== 'production';

// 模块级别变量
let ossClientInstance: OSS | undefined = undefined;
let fileStorageInstance: FileStorage | undefined = undefined;
let storageCount = 0;

/**
 * 本地文件存储实现
 */
export class LocalFileStorage implements FileStorage {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    // 基础URL，用于访问上传的文件
    this.baseUrl = '/api/files';
  }

  /**
   * 上传文件到本地存储
   * @param file 文件对象
   * @param fileId 可选的文件ID
   * @returns 文件存储结果
   */
  async uploadFile(file: File, fileId?: string): Promise<FileStorageResult> {
    // 生成唯一的文件标识符，如果没有提供
    const id = fileId || randomUUID();
    
    // 提取文件扩展名
    const fileExtension = path.extname(file.name) || '';
    
    // 生成存储路径
    const fileName = `${id}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    // 转换File对象为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    
    // 构建访问URL
    const url = `${this.baseUrl}/${fileName}`;
    
    return {
      id,
      name: file.name,
      path: fileName,
      url,
      provider: StorageProvider.LOCAL,
    };
  }

  /**
   * 删除本地存储中的文件
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 是否删除成功
   */
  async deleteFile(fileId: string, filePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    
    return false;
  }

  /**
   * 获取文件的访问URL
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 文件URL
   */
  getFileUrl(fileId: string, filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}

/**
 * 阿里云OSS存储实现
 * 使用前需要设置以下环境变量：
 * - ALIYUN_OSS_REGION: OSS区域
 * - ALIYUN_OSS_ACCESS_KEY_ID: AccessKey ID
 * - ALIYUN_OSS_ACCESS_KEY_SECRET: AccessKey Secret
 * - ALIYUN_OSS_BUCKET: Bucket名称
 * - ALIYUN_OSS_ENDPOINT: OSS访问域名（可选）
 */
export class AliyunOssStorage implements FileStorage {
  private client: OSS;
  private bucket: string;
  private region: string;
  private baseDir: string;

  constructor() {
    // 获取环境变量
    const region = process.env.ALIYUN_OSS_REGION;
    const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
    this.bucket = process.env.ALIYUN_OSS_BUCKET || '';
    this.region = region || '';
    this.baseDir = 'uploads'; // OSS中的基础目录
    
    if (!region || !accessKeyId || !accessKeySecret || !this.bucket) {
      throw new Error('阿里云OSS配置不完整，请检查环境变量');
    }
    
    // 使用模块级变量创建OSS客户端
    if (!ossClientInstance) {
      storageCount++;
      
      if (DEBUG) {
        console.log(`[OSS-${process.env.NODE_ENV}] 创建新的OSS客户端连接 #${storageCount}`);
        console.log(`[OSS-DEBUG] 进程ID: ${process.pid}, 时间戳: ${Date.now()}`);
      }
      
      ossClientInstance = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket: this.bucket,
        endpoint: process.env.ALIYUN_OSS_ENDPOINT,
      });
    } else if (DEBUG) {
      console.log(`[OSS-${process.env.NODE_ENV}] 复用现有OSS客户端连接 #${storageCount}`);
    }
    
    this.client = ossClientInstance;
  }

  /**
   * 上传文件到阿里云OSS
   * @param file 文件对象
   * @param fileId 可选的文件ID
   * @returns 文件存储结果
   */
  async uploadFile(file: File, fileId?: string): Promise<FileStorageResult> {
    console.log('开始上传文件到OSS:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileId,
    });

    // 生成唯一的文件标识符，如果没有提供
    const id = fileId || randomUUID();
    
    // 提取文件扩展名
    const fileExtension = path.extname(file.name) || '';
    
    // 生成OSS对象键（即路径）
    const objectKey = `${this.baseDir}/${id}${fileExtension}`;
    console.log('OSS对象键:', objectKey);
    
    // 转换File对象为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      // 上传到OSS
      console.log('正在上传到OSS...');
      const result = await this.client.put(objectKey, buffer);
      console.log('OSS上传成功:', result);
      
      // 获取文件URL
      const url = result.url || this.getFileUrl(id, objectKey);
      console.log('文件访问URL:', url);
      
      return {
        id,
        name: file.name,
        path: objectKey,
        url,
        provider: StorageProvider.ALIYUN_OSS,
      };
    } catch (error) {
      console.error('OSS上传失败:', error);
      throw error;
    }
  }

  /**
   * 删除OSS中的文件
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 是否删除成功
   */
  async deleteFile(fileId: string, filePath: string): Promise<boolean> {
    try {
      // 从OSS删除文件
      await this.client.delete(filePath);
      return true;
    } catch (error) {
      console.error('删除OSS文件失败:', error);
      return false;
    }
  }

  /**
   * 获取OSS文件的访问URL
   * @param fileId 文件ID
   * @param filePath 文件路径
   * @returns 文件URL
   */
  getFileUrl(fileId: string, filePath: string): string {
    // 生成签名URL或使用自定义域名
    return `https://${this.bucket}.${this.region}.aliyuncs.com/${filePath}`;
  }
}

/**
 * 创建文件存储服务
 * 根据环境变量选择存储提供商
 * @returns 文件存储服务实例
 */
export function createStorage(): FileStorage {
  // 检查是否已有实例
  if (fileStorageInstance) {
    if (DEBUG) {
      console.log(`[STORAGE-${process.env.NODE_ENV}] 复用现有的存储实例 #${storageCount}`);
    }
    return fileStorageInstance;
  }

  // 从环境变量获取存储提供商
  const provider = process.env.STORAGE_PROVIDER as StorageProvider || StorageProvider.LOCAL;
  
  if (DEBUG) {
    console.log(`[STORAGE-${process.env.NODE_ENV}] 创建存储提供者: ${provider}`);
  }
  
  let storage: FileStorage;
  
  switch (provider) {
    case StorageProvider.ALIYUN_OSS:
      try {
        storage = new AliyunOssStorage();
        if (DEBUG) console.log(`[STORAGE-${process.env.NODE_ENV}] 成功创建阿里云OSS存储`);
      } catch (error) {
        console.error(`[STORAGE-${process.env.NODE_ENV}] 创建阿里云OSS存储失败，将使用本地存储:`, error);
        storage = new LocalFileStorage();
      }
      break;
    case StorageProvider.LOCAL:
    default:
      if (DEBUG) console.log(`[STORAGE-${process.env.NODE_ENV}] 使用本地存储`);
      storage = new LocalFileStorage();
  }
  
  // 存储实例
  fileStorageInstance = storage;
  
  return storage;
}

// 注册进程终止时的清理函数
if (process.env.NODE_ENV !== 'production') {
  const registerCleanup = () => {
    process.on('SIGTERM', async () => {
      console.log('[STORAGE] 正在关闭OSS连接...');
      ossClientInstance = undefined;
      fileStorageInstance = undefined;
    });
    
    process.on('SIGINT', async () => {
      console.log('[STORAGE] 正在关闭OSS连接...');
      ossClientInstance = undefined;
      fileStorageInstance = undefined;
      process.exit(0);
    });
  };
  
  // 确保只注册一次
  let isCleanupRegistered = false;
  if (!isCleanupRegistered) {
    registerCleanup();
    isCleanupRegistered = true;
  }
}

// 默认导出当前环境配置的存储提供者
// export default createStorage(); 