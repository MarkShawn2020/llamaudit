#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { users } from '../lib/db/schema';

// 加载.env文件
config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL 或 POSTGRES_URL 环境变量未设置');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function setAdminRole(email: string) {
  try {
    console.log(`🔍 查找用户: ${email}`);
    
    // 查找用户
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0) {
      console.error(`❌ 未找到用户: ${email}`);
      process.exit(1);
    }
    
    const currentUser = user[0];
    console.log(`📋 当前用户信息:`);
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   姓名: ${currentUser.name || '未设置'}`);
    console.log(`   邮箱: ${currentUser.email}`);
    console.log(`   当前权限: ${currentUser.role}`);
    
    if (currentUser.role === 'admin') {
      console.log('✅ 用户已经是管理员权限');
      process.exit(0);
    }
    
    // 更新用户权限为admin
    await db.update(users)
      .set({ 
        role: 'admin',
        updatedAt: new Date()
      })
      .where(eq(users.email, email));
    
    console.log(`✅ 成功将用户 ${email} 设置为管理员权限`);
    
  } catch (error) {
    console.error('❌ 设置管理员权限失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 从命令行参数获取邮箱
const email = process.argv[2];

if (!email) {
  console.error('❌ 请提供用户邮箱');
  console.log('使用方法: pnpm tsx scripts/set-admin.ts user@example.com');
  process.exit(1);
}

// 验证邮箱格式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ 邮箱格式不正确');
  process.exit(1);
}

setAdminRole(email);