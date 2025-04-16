'use server';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';

/**
 * 添加存储相关的列到files表
 * 此函数用于确保数据库中有必要的列来支持文件存储功能
 */
export async function addStorageColumns(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getUser();
    
    // 仅限管理员执行
    if (!user || user.role !== 'admin') {
      return { 
        success: false, 
        message: '只有管理员可以执行数据库结构修改' 
      };
    }

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      return { 
        success: false, 
        message: '未设置数据库连接字符串' 
      };
    }

    // 创建数据库连接
    const client = postgres(connectionString, { max: 1 });
    const db = drizzle(client);

    try {
      // 执行ALTER TABLE语句添加缺失的列
      await db.execute(sql`
        ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider TEXT;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT;
      `);
      
      // 关闭连接
      await client.end();
      
      // 重新验证路径以刷新缓存
      revalidatePath('/projects');
      
      return { 
        success: true, 
        message: '存储列添加成功' 
      };
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      await client.end();
      
      return { 
        success: false, 
        message: `数据库操作失败: ${dbError instanceof Error ? dbError.message : '未知错误'}` 
      };
    }
  } catch (error) {
    console.error('添加存储列失败:', error);
    return {
      success: false,
      message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 检查数据库结构健康状态
 * 可用于检测是否需要执行迁移或添加列
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  missingColumns: string[];
}> {
  try {
    const user = await getUser();
    
    if (!user) {
      return {
        healthy: false,
        issues: ['未授权访问'],
        missingColumns: []
      };
    }

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      return {
        healthy: false,
        issues: ['未设置数据库连接字符串'],
        missingColumns: []
      };
    }

    // 创建数据库连接
    const client = postgres(connectionString, { max: 1 });
    const db = drizzle(client);
    
    // 检查表和列
    const issues: string[] = [];
    const missingColumns: string[] = [];
    
    try {
      // 检查storage_provider列是否存在
      const storageProviderResult = await db.execute(sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'storage_provider';
      `);
      
      if (!storageProviderResult.length) {
        missingColumns.push('files.storage_provider');
      }
      
      // 检查storage_path列是否存在
      const storagePathResult = await db.execute(sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'storage_path';
      `);
      
      if (!storagePathResult.length) {
        missingColumns.push('files.storage_path');
      }
      
      // 关闭连接
      await client.end();
      
      return {
        healthy: issues.length === 0 && missingColumns.length === 0,
        issues,
        missingColumns
      };
    } catch (dbError) {
      console.error('数据库检查失败:', dbError);
      await client.end();
      
      return {
        healthy: false,
        issues: [`数据库检查失败: ${dbError instanceof Error ? dbError.message : '未知错误'}`],
        missingColumns
      };
    }
  } catch (error) {
    console.error('检查数据库健康状态失败:', error);
    return {
      healthy: false,
      issues: [`操作失败: ${error instanceof Error ? error.message : '未知错误'}`],
      missingColumns: []
    };
  }
} 