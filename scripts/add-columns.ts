import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// 加载环境变量
dotenv.config();

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('错误: 未设置 POSTGRES_URL 环境变量');
    process.exit(1);
  }

  console.log('连接到数据库...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    console.log('添加缺失的列...');
    
    // 直接执行SQL添加列
    await db.execute(sql`
      ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider TEXT;
      ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT;
    `);
    
    console.log('列添加成功!');
  } catch (error) {
    console.error('添加列失败:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('数据库连接已关闭');
  }
}

main().catch(console.error); 