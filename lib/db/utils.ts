/**
 * 数据库工具函数
 */
import { client } from './drizzle';

/**
 * 对数据库查询进行包装，确保在查询完成后连接正确释放回连接池
 * 用于需要多次数据库操作的API路由
 * @param callback 包含数据库操作的回调函数
 * @returns 回调函数的返回值
 */
export async function withConnection<T>(callback: () => Promise<T>): Promise<T> {
  try {
    // 执行回调函数，包含所有数据库操作
    return await callback();
  } finally {
    // Next.js热重载可能导致连接重用问题，这里不做实际关闭
    // 连接会自动返回到连接池
    // 实际关闭通过进程退出信号处理
  }
}

/**
 * 辅助函数：在开发环境中重置数据库连接（用于调试连接问题）
 */
export async function resetConnection(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('尝试重置数据库连接...');
      await client.end({ timeout: 5 });
      console.log('数据库连接已重置');
    } catch (error) {
      console.error('重置数据库连接失败:', error);
    }
  }
} 