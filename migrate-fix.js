// 修复数据库迁移问题的脚本
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL
});

async function main() {
  try {
    console.log('开始连接数据库...');
    await client.connect();
    console.log('成功连接数据库');

    // 检查 drizzle 表是否存在
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'drizzle'
        AND tablename = '__drizzle_migrations'
      );
    `);

    if (res.rows[0].exists) {
      console.log('正在删除迁移表...');
      
      // 删除迁移表
      await client.query('DROP TABLE IF EXISTS drizzle.__drizzle_migrations;');
      
      // 删除 schema
      await client.query('DROP SCHEMA IF EXISTS drizzle;');
      
      console.log('迁移表删除成功');
    } else {
      console.log('迁移表不存在，无需删除');
    }

    // 修复元数据文件的路径
    console.log('\n要完成修复，请执行以下步骤:');
    console.log('1. 删除 lib/db/migrations/0003_dashing_phil_sheldon.sql 文件');
    console.log('2. 删除 lib/db/migrations/meta/_journal.json 中的多余记录');
    console.log('3. 重新生成迁移文件: pnpm db:generate');
    console.log('4. 执行迁移: pnpm db:migrate');
    
  } catch (error) {
    console.error('执行过程中出错:', error);
  } finally {
    await client.end();
    console.log('数据库连接已关闭');
  }
}

main(); 