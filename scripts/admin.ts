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

// 列出所有管理员
async function listAdmins() {
  try {
    console.log('📋 查找所有管理员用户...\n');
    
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    
    if (adminUsers.length === 0) {
      console.log('ℹ️ 当前系统中没有管理员用户');
      return;
    }
    
    console.log(`找到 ${adminUsers.length} 个管理员用户:\n`);
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || '未设置姓名'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   创建时间: ${user.createdAt?.toLocaleString('zh-CN') || '未知'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 查询管理员列表失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 设置管理员权限
async function setAdmin(email: string) {
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
      return;
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

// 移除管理员权限
async function unsetAdmin(email: string) {
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
    
    if (currentUser.role !== 'admin') {
      console.log('ℹ️ 用户不是管理员权限，无需移除');
      return;
    }
    
    // 更新用户权限为普通用户
    await db.update(users)
      .set({ 
        role: 'user',
        updatedAt: new Date()
      })
      .where(eq(users.email, email));
    
    console.log(`✅ 成功移除用户 ${email} 的管理员权限`);
    
  } catch (error) {
    console.error('❌ 移除管理员权限失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
📖 管理员权限管理工具

使用方法:
  pnpm admin list                    # 列出所有管理员用户
  pnpm admin set <email>             # 设置用户为管理员
  pnpm admin unset <email>           # 移除用户的管理员权限

示例:
  pnpm admin list
  pnpm admin set user@example.com
  pnpm admin unset user@example.com
`);
}

// 验证邮箱格式
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 主函数
async function main() {
  const [, , command, email] = process.argv;
  
  if (!command) {
    showHelp();
    process.exit(1);
  }
  
  switch (command.toLowerCase()) {
    case 'list':
    case 'ls':
      await listAdmins();
      break;
      
    case 'set':
    case 'add':
      if (!email) {
        console.error('❌ 请提供用户邮箱');
        console.log('使用方法: pnpm admin set user@example.com');
        process.exit(1);
      }
      if (!validateEmail(email)) {
        console.error('❌ 邮箱格式不正确');
        process.exit(1);
      }
      await setAdmin(email);
      break;
      
    case 'unset':
    case 'remove':
    case 'rm':
      if (!email) {
        console.error('❌ 请提供用户邮箱');
        console.log('使用方法: pnpm admin unset user@example.com');
        process.exit(1);
      }
      if (!validateEmail(email)) {
        console.error('❌ 邮箱格式不正确');
        process.exit(1);
      }
      await unsetAdmin(email);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch(console.error);