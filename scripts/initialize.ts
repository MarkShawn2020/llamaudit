/**
 * 构建时系统初始化脚本
 * 在构建开始前执行所有需要的初始化工作
 */
import 'dotenv/config';
import { safeInitializeStorageSystem } from '../lib/actions/file-actions';
import { safeInitializeExampleService } from '../lib/actions/example-action';

// 支持命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

async function initializeAllServices() {
  console.log('[BUILD-INIT] 开始执行系统初始化...');
  
  // 记录开始时间
  const startTime = Date.now();
  
  try {
    // 1. 初始化存储系统
    if (isVerbose) console.log('[BUILD-INIT] 初始化存储系统...');
    const storageResult = await safeInitializeStorageSystem();
    if (!storageResult && !isDryRun) {
      throw new Error('存储系统初始化失败');
    }
    
    // 2. 初始化示例服务
    if (isVerbose) console.log('[BUILD-INIT] 初始化示例服务...');
    const exampleResult = await safeInitializeExampleService();
    if (!exampleResult && !isDryRun) {
      console.warn('[BUILD-INIT] 示例服务初始化警告: 初始化可能未完成');
    }
    
    // 3. 可以在这里添加其他初始化服务
    
    // 记录完成时间
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`[BUILD-INIT] 系统初始化完成! (耗时: ${duration.toFixed(2)}秒)`);
    return true;
  } catch (error) {
    console.error('[BUILD-INIT] 系统初始化失败:', error);
    
    // 如果不是干运行模式，则失败退出
    if (!isDryRun) {
      process.exit(1);
    }
    
    return false;
  }
}

// 立即执行初始化
(async () => {
  const success = await initializeAllServices();
  
  // 如果是被子进程调用，则退出
  if (!process.env.IS_BUILD_SCRIPT_PARENT) {
    process.exit(success ? 0 : 1);
  }
})(); 