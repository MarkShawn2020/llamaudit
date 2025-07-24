import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const client = postgres(process.env.POSTGRES_URL, { max: 1 });
const db = drizzle(client);

async function resetDatabase() {
  console.log('🗑️  重置数据库...\n');

  try {
    // 1. 删除所有外键约束
    console.log('1. 删除所有外键约束...');
    const constraints = await db.execute(sql`
      SELECT conname, conrelid::regclass AS table_name
      FROM pg_constraint 
      WHERE contype = 'f' 
      AND connamespace = 'public'::regnamespace;
    `);

    for (const constraint of constraints) {
      const constraintName = (constraint as any).conname;
      const tableName = (constraint as any).table_name;
      console.log(`   删除约束: ${constraintName} from ${tableName}`);
      await db.execute(sql.raw(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`));
    }

    // 2. 删除所有表
    console.log('\n2. 删除所有表...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

    for (const table of tables) {
      const tableName = (table as any).table_name;
      console.log(`   删除表: ${tableName}`);
      await db.execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`));
    }

    // 3. 删除 drizzle schema 和迁移跟踪表
    console.log('\n3. 删除 Drizzle 迁移跟踪...');
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`);

    console.log('\n✅ 数据库重置完成！');

  } catch (error) {
    console.error('❌ 重置数据库时出错:', error);
    throw error;
  } finally {
    await client.end();
  }
}

resetDatabase();