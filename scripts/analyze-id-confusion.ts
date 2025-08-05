#!/usr/bin/env tsx
/**
 * 分析ID混淆问题的诊断脚本
 * 专门查找项目 1441d646-e959-4624-8b1d-5e97a13743e6 的ID混淆问题
 */

import { db } from '../lib/db/drizzle';
import { auditUnits } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function analyzeIdConfusion() {
  const suspiciousProjectId = '1441d646-e959-4624-8b1d-5e97a13743e6';
  
  console.log('🔍 分析ID混淆问题...');
  console.log(`目标项目ID: ${suspiciousProjectId}`);
  console.log('='.repeat(80));

  try {
    // 1. 检查项目记录的完整信息
    console.log('\n1️⃣ 检查项目记录完整信息...');
    const project = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, suspiciousProjectId),
    });

    if (!project) {
      console.log('❌ 项目不存在');
      return;
    }

    console.log('✅ 项目记录详情:');
    console.log('  ID:', project.id);
    console.log('  名称:', project.name);
    console.log('  代码:', project.code);
    console.log('  数据集ID:', project.datasetId);
    console.log('  创建时间:', project.createdAt);
    console.log('  更新时间:', project.updatedAt);
    console.log('  创建者:', project.createdBy);

    // 2. 分析ID混淆情况
    console.log('\n2️⃣ 分析ID混淆情况...');
    const idMatches = project.id === project.datasetId;
    
    if (idMatches && project.datasetId) {
      console.log('🚨 发现ID混淆问题!');
      console.log('  项目ID和数据集ID相同:', project.id);
      console.log('  这表明在某个环节项目ID被错误地用作数据集ID');
    } else if (project.datasetId) {
      console.log('✅ 项目ID和数据集ID不同:');
      console.log('  项目ID:', project.id);
      console.log('  数据集ID:', project.datasetId);
    } else {
      console.log('⚠️ 项目没有设置数据集ID');
    }

    // 3. 检查是否有其他项目也有相同的ID混淆问题
    console.log('\n3️⃣ 检查其他项目是否有相同问题...');
    const allProjects = await db.query.auditUnits.findMany({
      columns: {
        id: true,
        name: true,
        datasetId: true,
        createdAt: true
      }
    });

    const idConfusionProjects = allProjects.filter(p => p.id === p.datasetId && p.datasetId);
    
    if (idConfusionProjects.length > 0) {
      console.log(`🚨 发现 ${idConfusionProjects.length} 个项目存在ID混淆问题:`);
      idConfusionProjects.forEach(p => {
        console.log(`  - ${p.name} (${p.id}) - 创建于 ${p.createdAt}`);
      });
    } else {
      console.log('✅ 没有发现其他项目存在ID混淆问题');
    }

    // 4. 分析可能的原因
    console.log('\n4️⃣ 分析可能的ID混淆原因...');
    
    if (idMatches && project.datasetId) {
      console.log('📋 可能的混淆原因分析:');
      console.log('1. createProjectWithDataset 函数中的问题:');
      console.log('   - 第354行: id: datasetId (使用datasetId作为项目ID)');
      console.log('   - 第363行: datasetId: datasetId (同时设置datasetId字段)');
      console.log('   - 这意味着项目被创建时project.id就等于dataset.id');
      
      console.log('\n2. useProjectDataset.ensureDataset 中的问题:');
      console.log('   - 第225-228行: 验证现有数据集时传入的是existingDatasetId');
      console.log('   - 如果传入项目ID而不是数据集ID，会导致API调用失败');
      
      console.log('\n3. 项目详情页初始化问题:');
      console.log('   - 第88行: await ensureDataset(undefined)');
      console.log('   - 如果项目已有datasetId，应该传入该ID而不是undefined');
    }

    // 5. 检查创建方式
    console.log('\n5️⃣ 检查项目创建方式...');
    
    // 检查项目创建时间，推断使用的创建方式
    if (project.createdAt) {
      const createdDate = new Date(project.createdAt);
      console.log('项目创建时间:', createdDate.toISOString());
      
      // 如果ID相同且是较新创建的项目，很可能使用了createProjectWithDataset
      if (idMatches && project.datasetId) {
        console.log('📝 推断: 该项目使用了 createProjectWithDataset 函数创建');
        console.log('   这解释了为什么项目ID等于数据集ID');
        console.log('   在该函数中，项目记录使用数据集ID作为主键');
      }
    }

    // 6. 提供修复建议
    console.log('\n6️⃣ 修复建议...');
    
    if (idMatches && project.datasetId) {
      console.log('🔧 修复方案:');
      console.log('1. 立即修复: 不需要修改数据库记录');
      console.log('   - 当前的ID关系实际上是createProjectWithDataset设计的结果');
      console.log('   - 问题在于调用getDatasetDetails时的参数传递');
      
      console.log('\n2. 代码修复建议:');
      console.log('   a) 确保所有调用getDatasetDetails的地方传递datasetId而不是projectId');
      console.log('   b) 在项目详情页初始化时，如果已有datasetId，传入该ID：');
      console.log('      await ensureDataset(project.datasetId)');
      console.log('   c) 在useProjectDataset.ensureDataset中添加参数验证');
      
      console.log('\n3. 长期方案:');
      console.log('   考虑重构createProjectWithDataset，使projectId和datasetId分离');
    }

  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error);
  }
}

// 运行分析
analyzeIdConfusion().catch(console.error);