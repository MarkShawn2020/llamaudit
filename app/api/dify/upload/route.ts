import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * 代理转发文件上传请求到Dify API
 * 
 * 此路由接收客户端的文件上传请求，添加必要的认证头信息，
 * 然后转发到Dify API的文件上传端点
 */
export async function POST(request: NextRequest) {
  try {
    // 获取Dify API密钥
    const apiKey = process.env.DIFY_API_KEY;
    if (!apiKey) {
      logger.error('未配置DIFY_API_KEY环境变量');
      return NextResponse.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    // 从请求中获取FormData
    const formData = await request.formData();
    
    // 确保文件存在
    const file = formData.get('file') as File | null;
    const user = formData.get('user') as string | null;
    
    if (!file) {
      logger.error('未提供文件');
      return NextResponse.json(
        { error: '未提供文件' },
        { status: 400 }
      );
    }
    
    if (!user) {
      logger.error('未提供用户标识符');
      return NextResponse.json(
        { error: '未提供用户标识符' },
        { status: 400 }
      );
    }
    
    logger.info('准备转发文件上传请求到Dify API', {
      filename: file.name,
      size: file.size,
      user: user
    });

    // 创建新的FormData，确保格式符合Dify API要求
    const difyFormData = new FormData();
    difyFormData.append('file', file);
    difyFormData.append('user', user);

    // 转发请求到Dify API
    const difyResponse = await fetch('http://localhost/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: difyFormData
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      logger.error('Dify API返回错误', {
        status: difyResponse.status,
        error: errorText
      });
      
      return NextResponse.json(
        { error: `Dify API错误: ${difyResponse.status}` },
        { status: difyResponse.status }
      );
    }

    // 获取并返回Dify API的响应
    const responseData = await difyResponse.json();
    logger.info('文件上传成功', {
      fileId: responseData.id,
      filename: responseData.name
    });
    
    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('文件上传处理失败', { error });
    
    return NextResponse.json(
      { error: '文件上传处理失败' },
      { status: 500 }
    );
  }
}
