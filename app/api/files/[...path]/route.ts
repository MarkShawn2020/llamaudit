import { getUser } from '@/lib/db/queries';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/**
 * 文件访问API
 * 提供上传文件的访问功能
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 基本身份验证（可选，视文件访问权限需求）
    const user = await getUser();
    if (!user) {
      return new NextResponse('未授权访问', { status: 401 });
    }

    // 获取文件路径
    const filePath = path.join(process.cwd(), 'uploads', ...params.path);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return new NextResponse('文件不存在', { status: 404 });
    }

    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();

    // 设置内容类型
    let contentType = 'application/octet-stream';
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(filePath);

    // 返回文件内容
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    console.error('文件访问错误:', error);
    return new NextResponse('服务器错误', { status: 500 });
  }
} 