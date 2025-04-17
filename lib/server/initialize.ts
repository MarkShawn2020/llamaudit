/**
 * 服务器初始化工具
 * 提供安全的一次性初始化机制，适用于Next.js应用的各种场景
 */

// 记录所有已初始化的服务
const initializedServices = new Set<string>();

// 全局跟踪初始化状态
const globalInitState = global as unknown as {
  serverInitialized: Record<string, boolean>;
};

// 确保全局初始化状态对象存在
if (!globalInitState.serverInitialized) {
  globalInitState.serverInitialized = {};
}

/**
 * 安全地执行一次性初始化函数
 * 确保在同一个应用生命周期内，指定的初始化函数只会执行一次
 * 
 * @param serviceId 服务标识符，用于区分不同的初始化任务
 * @param initFn 初始化函数，如果初始化成功应该返回true
 * @param options 初始化选项
 * @returns 初始化结果
 */
export async function initializeOnce(
  serviceId: string,
  initFn: () => Promise<boolean>,
  options: {
    logPrefix?: string;
    force?: boolean;
  } = {}
): Promise<boolean> {
  const { logPrefix = '[SERVER-INIT]', force = false } = options;
  
  // 检查是否已在当前实例中初始化
  if (initializedServices.has(serviceId) && !force) {
    return true;
  }
  
  // 检查是否已在全局范围内初始化
  if (globalInitState.serverInitialized[serviceId] && !force) {
    initializedServices.add(serviceId); // 在当前实例中标记为已初始化
    return true;
  }
  
  // 标记为正在初始化中
  let isInitializing = true;
  
  try {
    // 执行初始化函数
    console.log(`${logPrefix} 初始化服务: ${serviceId}`);
    const success = await initFn();
    
    if (success) {
      // 在全局和局部标记为已初始化
      globalInitState.serverInitialized[serviceId] = true;
      initializedServices.add(serviceId);
      console.log(`${logPrefix} 服务初始化成功: ${serviceId}`);
    } else {
      console.error(`${logPrefix} 服务初始化失败: ${serviceId}`);
    }
    
    return success;
  } catch (error) {
    console.error(`${logPrefix} 服务初始化出错: ${serviceId}`, error);
    return false;
  } finally {
    isInitializing = false;
  }
}

/**
 * 检查服务是否已初始化
 * 
 * @param serviceId 服务标识符
 * @returns 是否已初始化
 */
export function isInitialized(serviceId: string): boolean {
  return !!globalInitState.serverInitialized[serviceId];
}

/**
 * 重置初始化状态
 * 主要用于测试或特殊情况
 * 
 * @param serviceId 可选的服务标识符，不提供则重置所有
 */
export function resetInitialization(serviceId?: string): void {
  if (serviceId) {
    delete globalInitState.serverInitialized[serviceId];
    initializedServices.delete(serviceId);
  } else {
    globalInitState.serverInitialized = {};
    initializedServices.clear();
  }
} 