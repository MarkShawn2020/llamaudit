import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

// DEBUG标记
const DEBUG = process.env.NODE_ENV !== 'production';

// 连接配置 - 开发环境极度限制连接数
const connectionOptions = {
  // 在开发环境下极大限制连接数，防止连接激增
  max: process.env.NODE_ENV === 'production' ? 10 : 3,
  idle_timeout: 20, // 空闲连接超时（秒）
  connect_timeout: 10, // 连接超时（秒）
  prepare: false, // 禁用预编译语句以减少连接使用
};

// Next.js开发环境下每个路由处理器都会加载独立的模块副本
// 这意味着模块级变量在不同路由处理程序之间不共享
// 以下模式尽量减少问题，但无法完全避免开发环境下的多连接

/**
 * 在生产环境中全局缓存连接池以在Next.js函数调用之间重用
 * 在开发环境中每个实例保持其自己的连接池
 */
const globalForDb = global as unknown as { 
  pg: ReturnType<typeof postgres> | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  connectionCount: number;
};

// 创建数据库连接和客户端
let connectionCount = 0;
let clientInstance: ReturnType<typeof postgres> | undefined = undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined = undefined;

// 初始化或获取连接实例
export const client = (() => {
  if (!clientInstance) {
    connectionCount++;
    
    if (DEBUG) {
      console.log(`[DB-${process.env.NODE_ENV}] 创建新的数据库连接池 #${connectionCount}`);
      console.log(`[DB-DEBUG] 进程ID: ${process.pid}, 时间戳: ${Date.now()}`);
    }
    
    try {
      clientInstance = postgres(process.env.POSTGRES_URL!, connectionOptions);
    } catch (error) {
      console.error('[DB] 创建数据库连接池失败:', error);
      throw new Error('数据库配置错误或连接失败');
    }
  } else if (DEBUG) {
    console.log(`[DB-${process.env.NODE_ENV}] 复用现有数据库连接池 #${connectionCount}`);
  }
  
  return clientInstance;
})();

// 暴露drizzle实例
export const db = (() => {
  if (!dbInstance) {
    dbInstance = drizzle(client, { schema });
    
    if (DEBUG) {
      console.log(`[DB-${process.env.NODE_ENV}] 创建新的drizzle实例`);
    }
  } else if (DEBUG) {
    console.log(`[DB-${process.env.NODE_ENV}] 复用现有drizzle实例`);
  }
  
  return dbInstance;
})();

// 导出getDb函数确保导入的一致性
export const getDb = () => db;

// 注册进程终止时的清理函数
if (process.env.NODE_ENV !== 'production') {
  const registerCleanup = () => {
    process.on('SIGTERM', async () => {
      console.log('[DB] 正在关闭数据库连接...');
      if (clientInstance) {
        await clientInstance.end();
        clientInstance = undefined;
        dbInstance = undefined;
      }
    });
    
    process.on('SIGINT', async () => {
      console.log('[DB] 正在关闭数据库连接...');
      if (clientInstance) {
        await clientInstance.end();
        clientInstance = undefined;
        dbInstance = undefined;
      }
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

