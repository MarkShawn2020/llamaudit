import OSS from 'ali-oss';

export interface OSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
}

// 服务端 OSS 配置
export const ossConfig: OSSConfig = {
  region: process.env.NEXT_PUBLIC_OSS_REGION || '',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET || '',
  endpoint: process.env.NEXT_PUBLIC_OSS_ENDPOINT || '',
};

// 创建服务端 OSS 客户端实例
export function createServerOSSClient() {
  return new OSS({
    region: ossConfig.region,
    accessKeyId: ossConfig.accessKeyId,
    accessKeySecret: ossConfig.accessKeySecret,
    bucket: ossConfig.bucket,
    endpoint: ossConfig.endpoint,
  });
}

/**
 * 生成文件上传签名URL
 * @param objectName 文件在 OSS 中的路径
 * @param contentType 文件类型
 * @returns 签名后的上传URL和文件访问URL
 */
export async function generateUploadSignedUrl(objectName: string, contentType: string) {
  const client = createServerOSSClient();
  
  // 生成上传签名URL，有效期15分钟
  const uploadUrl = client.signatureUrl(objectName, {
    method: 'PUT',
    'Content-Type': contentType,
    expires: 900,
  });

  // 生成文件访问URL，有效期1年
  const accessUrl = client.signatureUrl(objectName, {
    expires: 60 * 60 * 24 * 365,
  });

  return {
    uploadUrl,
    accessUrl,
  };
} 