import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 创建连接池
const connectionString = process.env.POSTGRES_URL!;
const queryClient = postgres(connectionString, {
  max: 10, // 最大连接数
  idle_timeout: 20, // 空闲连接超时（秒）
  connect_timeout: 10, // 连接超时（秒）
});

// 创建 Drizzle 实例
export const db = drizzle(queryClient, { schema });

// 导出数据库类型
export type DB = PostgresJsDatabase<typeof schema>;

// 包装器函数，用于管理数据库操作
export async function withConnection<T>(
  operation: (db: DB) => Promise<T>
): Promise<T> {
  try {
    // 执行数据库操作
    return await operation(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    
    // 检查是否是连接错误
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code?: string; message?: string };
      
      if (dbError.code === 'ECONNREFUSED') {
        throw new Error('数据库服务暂时不可用，请稍后重试或联系管理员');
      }
      
      if (dbError.code === 'ENOTFOUND') {
        throw new Error('无法连接到数据库服务器，请检查网络连接');
      }
      
      if (dbError.code === 'ETIMEDOUT') {
        throw new Error('数据库连接超时，请稍后重试');
      }
    }
    
    // 对于其他数据库错误，也提供友好的错误信息
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as Error).message;
      if (message.includes('connect') || message.includes('connection')) {
        throw new Error('数据库连接失败，请稍后重试');
      }
    }
    
    throw error;
  }
}

// 用于应用关闭时清理连接
export async function closeConnections() {
  await queryClient.end();
}

// 导出 schema 以便在其他地方使用
export * from './schema';
