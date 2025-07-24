import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const client = postgres(process.env.POSTGRES_URL, { max: 1 });

async function dropAllTables() {
  console.log('🗑️ 删除所有表和schema...');

  try {
    // 删除所有数据并重建schema
    await client`DROP SCHEMA IF EXISTS public CASCADE;`;
    await client`CREATE SCHEMA public;`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE;`;
    
    console.log('✅ 所有表已删除，数据库已重置');
  } catch (error) {
    console.error('❌ 删除表时出错:', error);
    throw error;
  } finally {
    await client.end();
  }
}

dropAllTables();