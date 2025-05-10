import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { saveDifyFileToDatabase } from '@/lib/actions/dify-file-actions';

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
    const url = `${process.env.NEXT_PUBLIC_DIFY_API_URL}/files/upload`
    const Authorization = `Bearer ${apiKey}`
    logger.info('to dify', {url, Authorization})
    const difyResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization,
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

    // 获取Dify API的响应
    const responseData = await difyResponse.json();
    logger.info('文件上传到Dify成功', {
      fileId: responseData.id,
      filename: responseData.name
    });
    
    try {
      // 从请求中获取的user参数实际上是projectId/auditUnitId
      const auditUnitId = user;
      
      // 将文件信息保存到数据库
      await saveDifyFileToDatabase(auditUnitId, responseData);
      logger.info('文件数据已保存到数据库', {
        fileId: responseData.id,
        filename: responseData.name,
        auditUnitId
      });
    } catch (dbError) {
      logger.error('保存文件到数据库失败，但文件已上传到Dify', {
        error: dbError,
        fileId: responseData.id
      });
      // 即使数据库保存失败，我们仍然返回Dify上传成功的结果
      // 这样客户端至少可以获得Dify文件ID
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('文件上传处理失败', { error });
    
    return NextResponse.json(
      { error: '文件上传处理失败' },
      { status: 500 }
    );
  }
}
