import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('开始执行更新流程...');

    // 检查git状态
    console.log('检查git状态...');
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    if (gitStatus.trim()) {
      console.log('发现未提交的更改:', gitStatus);
      return NextResponse.json({
        success: false,
        message: '存在未提交的更改，请先处理后再更新',
        details: gitStatus
      }, { status: 400 });
    }

    // 获取当前版本信息
    console.log('获取当前版本...');
    const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
    console.log('当前commit:', currentCommit.trim());

    // 拉取最新代码
    console.log('拉取最新代码...');
    const { stdout: pullResult } = await execAsync('git pull origin main');
    console.log('Git pull结果:', pullResult);

    // 检查是否有更新
    const { stdout: newCommit } = await execAsync('git rev-parse HEAD');
    if (currentCommit.trim() === newCommit.trim()) {
      console.log('已是最新版本');
      return NextResponse.json({
        success: true,
        message: '已是最新版本，无需更新',
        updated: false
      });
    }

    console.log('发现新版本，开始更新依赖和构建...');

    // 安装依赖
    console.log('安装依赖...');
    await execAsync('pnpm install', { timeout: 120000 }); // 2分钟超时

    // 构建项目
    console.log('构建项目...');
    await execAsync('pnpm build', { timeout: 300000 }); // 5分钟超时

    console.log('更新完成，准备重启服务...');

    // 延迟重启，让响应先返回
    setTimeout(() => {
      console.log('重启服务...');
      process.exit(0);
    }, 1000);

    return NextResponse.json({
      success: true,
      message: '更新成功，服务即将重启',
      updated: true,
      oldCommit: currentCommit.trim(),
      newCommit: newCommit.trim()
    });

  } catch (error: any) {
    console.error('更新失败:', error);
    
    return NextResponse.json({
      success: false,
      message: '更新失败',
      error: error.message,
      details: error.stdout || error.stderr
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 检查是否有可用更新
    const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');
    const { stdout: remoteCommit } = await execAsync('git ls-remote origin main');
    const remoteHash = remoteCommit.split('\t')[0];
    
    const hasUpdate = currentCommit.trim() !== remoteHash.trim();
    
    return NextResponse.json({
      hasUpdate,
      currentCommit: currentCommit.trim(),
      remoteCommit: remoteHash.trim()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: '检查更新失败',
      details: error.message
    }, { status: 500 });
  }
}