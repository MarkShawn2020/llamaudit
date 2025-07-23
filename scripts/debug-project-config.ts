#!/usr/bin/env tsx
/**
 * Debug script for project Dify configuration
 * 用于诊断项目Dify配置问题的调试脚本
 */

import { db } from '../lib/db/drizzle';
import { auditUnits } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function debugProjectConfig() {
  const projectId = 'f7b12ed3-9ccc-4373-9697-e986311c6dd5';
  
  console.log('🔍 开始诊断项目Dify配置...');
  console.log(`项目ID: ${projectId}`);
  console.log('');

  try {
    // 1. 检查项目是否存在
    console.log('1️⃣ 检查项目是否存在...');
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, projectId),
      columns: {
        id: true,
        name: true,
        code: true,
        datasetId: true,
        difyBaseUrl: true,
        difyDatasetApiKey: true,
        difyConfigUpdatedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!project) {
      console.log('❌ 项目不存在');
      return;
    }

    console.log('✅ 项目存在:', {
      id: project.id,
      name: project.name,
      code: project.code,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
    console.log('');

    // 2. 检查Dify配置字段
    console.log('2️⃣ 检查Dify配置字段...');
    console.log('数据集ID:', project.datasetId || '❌ 未设置');
    console.log('Dify Base URL:', project.difyBaseUrl || '❌ 未设置');
    console.log('Dify Dataset API Key:', project.difyDatasetApiKey ? '✅ 已设置 (加密)' : '❌ 未设置');
    console.log('配置更新时间:', project.difyConfigUpdatedAt || '❌ 从未更新');
    console.log('');

    // 3. 分析配置状态
    console.log('3️⃣ 分析配置状态...');
    const hasValidConfig = !!(project.difyBaseUrl && project.difyDatasetApiKey);
    
    if (hasValidConfig) {
      console.log('✅ 项目有自定义Dify配置');
      console.log('配置来源: database');
    } else {
      console.log('⚠️ 项目没有自定义Dify配置，将使用环境变量');
      console.log('配置来源: environment');
      
      // 分析缺失的字段
      const missingFields = [];
      if (!project.difyBaseUrl) missingFields.push('difyBaseUrl');
      if (!project.difyDatasetApiKey) missingFields.push('difyDatasetApiKey');
      console.log('缺失字段:', missingFields.join(', '));
    }
    console.log('');

    // 4. 检查环境变量配置
    console.log('4️⃣ 检查环境变量配置...');
    const envDifyUrl = process.env.NEXT_PUBLIC_DIFY_API_URL;
    const envDifyKey = process.env.DIFY_DATASET_API_KEY;
    
    console.log('环境变量 NEXT_PUBLIC_DIFY_API_URL:', envDifyUrl || '❌ 未设置');
    console.log('环境变量 DIFY_DATASET_API_KEY:', envDifyKey ? '✅ 已设置' : '❌ 未设置');
    console.log('');

    // 5. 提供建议
    console.log('5️⃣ 诊断建议...');
    if (!hasValidConfig) {
      console.log('📋 解决方案:');
      console.log('1. 在项目页面打开Dify配置对话框');
      console.log('2. 选择"自定义配置"');
      console.log('3. 填写 API URL 和 Dataset API Key');
      console.log('4. 点击"保存配置"');
      console.log('5. 或者确保环境变量配置正确');
    } else {
      console.log('✅ 配置正常，如果仍有问题请检查API密钥有效性');
    }

  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error);
  }
}

// 运行诊断
debugProjectConfig().catch(console.error);