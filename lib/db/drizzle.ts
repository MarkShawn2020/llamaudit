import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// 连接配置
const connectionOptions = {
  max: 10, // 最大连接数
  idle_timeout: 20, // 空闲连接超时（秒）
  connect_timeout: 10, // 连接超时（秒）
  prepare: false, // 禁用预编译语句以减少连接使用
};

// 确保单例连接
// 在开发环境中，避免热重载导致的多次连接创建
let clientInstance: ReturnType<typeof postgres> | null = null;

// 获取数据库客户端实例
const getClient = () => {
  if (!clientInstance) {
    // 创建新的连接池
    console.log('创建新的数据库连接池');
    clientInstance = postgres(process.env.POSTGRES_URL!, connectionOptions);
  }
  return clientInstance;
};

// 获取数据库实例
export const client = getClient();
export const db = drizzle(client, { schema });

// 注册进程终止时的清理函数
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGTERM', async () => {
    console.log('正在关闭数据库连接...');
    if (clientInstance) {
      await clientInstance.end();
      clientInstance = null;
    }
  });
  
  process.on('SIGINT', async () => {
    console.log('正在关闭数据库连接...');
    if (clientInstance) {
      await clientInstance.end();
      clientInstance = null;
    }
    process.exit(0);
  });
}
