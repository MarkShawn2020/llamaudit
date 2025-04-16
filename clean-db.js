// 清理数据库中的所有表
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

    // 获取所有现有表
    const tablesRes = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename != 'pg_stat_statements'
    `);
    
    const tables = tablesRes.rows.map(row => row.tablename);
    
    if (tables.length > 0) {
      console.log(`发现 ${tables.length} 个表: ${tables.join(', ')}`);
      
      // 关闭外键约束
      await client.query('SET session_replication_role = replica;');
      
      // 删除所有表
      for (const table of tables) {
        console.log(`删除表: ${table}`);
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      }
      
      // 恢复外键约束
      await client.query('SET session_replication_role = DEFAULT;');
      
      console.log('所有表已成功删除');
    } else {
      console.log('没有找到任何表');
    }
    
    console.log('\n数据库已清空，现在可以执行:');
    console.log('1. pnpm db:generate - 生成新的迁移文件');
    console.log('2. pnpm db:migrate - 执行迁移');
    console.log('3. pnpm db:seed - 填充初始数据');
    
  } catch (error) {
    console.error('执行过程中出错:', error);
  } finally {
    await client.end();
    console.log('数据库连接已关闭');
  }
}

main(); 