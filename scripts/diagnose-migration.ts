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

async function diagnoseMigration() {
  console.log('🔍 诊断数据库和迁移状态...\n');

  try {
    // 1. 检查 activity_logs 表是否存在
    console.log('1. 检查 activity_logs 表是否存在...');
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);
    console.log(`   activity_logs 表存在: ${tableExists[0].exists ? '✅ 是' : '❌ 否'}\n`);

    // 2. 检查 __drizzle_migrations 表是否存在
    console.log('2. 检查 __drizzle_migrations 迁移跟踪表...');
    const migrationTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    console.log(`   __drizzle_migrations 表存在: ${migrationTableExists[0].exists ? '✅ 是' : '❌ 否'}`);

    if (migrationTableExists[0].exists) {
      // 3. 查看已应用的迁移
      console.log('\n3. 查看已应用的迁移记录...');
      const appliedMigrations = await db.execute(sql`
        SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
      `);
      
      if (appliedMigrations.length === 0) {
        console.log('   ❌ 没有迁移记录');
      } else {
        console.log(`   ✅ 找到 ${appliedMigrations.length} 条迁移记录:`);
        appliedMigrations.forEach((migration: any, index: number) => {
          console.log(`      ${index + 1}. ${migration.hash} - ${migration.created_at}`);
        });
      }
    } else {
      console.log('   ⚠️  迁移跟踪表不存在，这可能是问题的根源');
    }

    // 4. 检查所有表的存在情况
    console.log('\n4. 检查数据库中的所有表...');
    const allTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (allTables.length === 0) {
      console.log('   ❌ 数据库中没有表');
    } else {
      console.log(`   ✅ 找到 ${allTables.length} 个表:`);
      allTables.forEach((table: any) => {
        console.log(`      - ${table.table_name}`);
      });
    }

    console.log('\n📋 诊断摘要:');
    console.log('='.repeat(50));
    
    if (tableExists[0].exists && !migrationTableExists[0].exists) {
      console.log('🎯 问题识别: 数据库表存在，但缺少迁移跟踪表');
      console.log('💡 推荐解决方案: 手动创建迁移跟踪记录');
    } else if (!tableExists[0].exists && migrationTableExists[0].exists) {
      console.log('🎯 问题识别: 迁移跟踪表存在，但实际表不存在');
      console.log('💡 推荐解决方案: 清理迁移跟踪表并重新运行迁移');
    } else if (!tableExists[0].exists && !migrationTableExists[0].exists) {
      console.log('🎯 问题识别: 数据库为空状态');
      console.log('💡 推荐解决方案: 直接运行迁移应该可以成功');
    } else {
      console.log('🎯 问题识别: 表和跟踪表都存在，需要更深入的分析');
      console.log('💡 推荐解决方案: 检查迁移记录的完整性');
    }

  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
  } finally {
    await client.end();
  }
}

diagnoseMigration();