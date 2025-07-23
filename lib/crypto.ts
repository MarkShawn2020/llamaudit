/**
 * 加密工具模块
 * 用于安全存储和处理敏感的API密钥
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * 从环境变量获取加密密钥
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!key) {
    throw new Error('加密密钥未配置：需要设置 ENCRYPTION_KEY 或 AUTH_SECRET 环境变量');
  }
  
  // 使用 PBKDF2 从密钥派生固定长度的加密密钥
  return crypto.pbkdf2Sync(key, 'dify-config-salt', 10000, KEY_LENGTH, 'sha256');
}

/**
 * 加密敏感字符串（如API密钥）
 */
export function encryptApiKey(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('dify-api-key'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // 组合 IV + Tag + 加密数据
    const result = iv.toString('hex') + tag.toString('hex') + encrypted;
    return result;
  } catch (error) {
    console.error('API密钥加密失败:', error);
    throw new Error('API密钥加密失败');
  }
}

/**
 * 解密敏感字符串（如API密钥）
 */
export function decryptApiKey(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // 提取 IV、Tag 和加密数据
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('dify-api-key'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('API密钥解密失败:', error);
    throw new Error('API密钥解密失败');
  }
}

/**
 * 验证加密数据的完整性
 */
export function isValidEncryptedData(encryptedData: string): boolean {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return false;
    }
    
    // 检查最小长度：IV(32) + Tag(32) + 至少一些加密数据
    if (encryptedData.length < (IV_LENGTH + TAG_LENGTH) * 2 + 16) {
      return false;
    }
    
    // 尝试解密以验证格式
    decryptApiKey(encryptedData);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全比较两个字符串（防止时序攻击）
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 掩码显示敏感信息（用于日志和调试）
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(8);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const middle = '*'.repeat(Math.max(8, data.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
}