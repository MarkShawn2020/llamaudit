import { NextResponse } from 'next/server';
import { safeInitializeStorageSystem } from '@/lib/actions/file-actions';
import { safeInitializeExampleService } from '@/lib/actions/example-action';

// 系统初始化接口，通过Next.js边缘缓存确保仅执行一次
export async function GET() {
  console.log('[SYSTEM-API] 开始系统初始化流程');
  
  try {
    // 1. 初始化存储系统
    await safeInitializeStorageSystem();
    
    // 2. 初始化其他服务
    await safeInitializeExampleService();
    
    // 3. 可以在这里添加其他需要的初始化服务
    
    return NextResponse.json(
      { success: true, message: '系统初始化成功' },
      { 
        status: 200,
        headers: {
          // 设置缓存控制，避免频繁调用
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      }
    );
  } catch (error) {
    console.error('[SYSTEM-API] 系统初始化失败:', error);
    return NextResponse.json(
      { success: false, message: '系统初始化失败' },
      { status: 500 }
    );
  }
} 