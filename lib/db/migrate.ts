import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

// 获取数据库连接字符串
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('错误: 未设置 POSTGRES_URL 环境变量');
  process.exit(1);
}

// 创建数据库连接
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// 迁移路径
const migrationsFolder = path.join(process.cwd(), 'lib', 'db', 'migrations');

// 运行迁移
async function main() {
  console.log('开始运行数据库迁移...');
  console.log(`迁移文件目录: ${migrationsFolder}`);
  
  try {
    await migrate(db, { migrationsFolder });
    console.log('数据库迁移成功完成!');
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await client.end();
  }
}

main(); 