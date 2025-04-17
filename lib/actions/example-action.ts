'use server';

import { initializeOnce } from '../server/initialize';

/**
 * 示例初始化函数
 * 模拟一些需要在应用启动时执行一次的操作
 */
async function initializeExampleService(): Promise<boolean> {
  console.log('正在初始化示例服务...');
  
  // 模拟一些初始化工作
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('示例服务初始化完成');
  return true;
}

/**
 * 安全的示例服务初始化
 * 演示如何使用通用初始化工具
 */
export async function safeInitializeExampleService() {
  return initializeOnce('example-service', initializeExampleService, {
    logPrefix: '[EXAMPLE-SERVICE]'
  });
}

/**
 * 示例server action，在执行前确保服务已初始化
 */
export async function exampleServerAction(data: string) {
  // 确保服务已初始化
  await safeInitializeExampleService();
  
  // 正常的server action逻辑
  console.log('处理数据:', data);
  return { success: true, message: '处理成功' };
} 