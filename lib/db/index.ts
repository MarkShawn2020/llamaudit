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
    throw error;
  }
}

// 用于应用关闭时清理连接
export async function closeConnections() {
  await queryClient.end();
}

// 导出 schema 以便在其他地方使用
export * from './schema';
