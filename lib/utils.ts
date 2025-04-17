import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名
 * 
 * @param inputs 类名数组
 * @returns 合并后的类名
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 

/**
 * 将字符串金额转换为数字
 * 
 * @param value 字符串金额，可能包含货币符号、逗号等
 * @returns 转换后的数字，无效输入返回null
 */
export function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // 如果已经是数字，直接返回
  if (typeof value === 'number') {
    return value;
  }
  
  // 字符串处理：移除货币符号和逗号
  const numStr = String(value).replace(/[¥￥$,\s]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numStr)) {
    return parseFloat(numStr);
  }
  
  return null;
} 
