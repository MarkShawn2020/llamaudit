import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { auditUnits, files } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/session';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// 获取被审计单位的文件列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const auditUnitId = params.id;
    
    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, auditUnitId),
    });

    if (!auditUnit) {
      return NextResponse.json(
        { error: '被审计单位不存在' },
        { status: 404 }
      );
    }

    // 获取被审计单位的文件
    const filesList = await db.query.files.findMany({
      where: eq(files.auditUnitId, auditUnitId),
      orderBy: (files, { desc }) => [desc(files.uploadDate)],
      with: {
        uploadedBy: {
          columns: {
            name: true,
          }
        }
      }
    });

    // 格式化响应
    const formattedFiles = filesList.map(file => ({
      id: file.id,
      filename: file.originalName,
      size: Number(file.fileSize),
      type: file.fileType,
      url: file.filePath,
      createdAt: file.uploadDate?.toISOString() || new Date().toISOString(),
      uploadedBy: file.uploadedBy?.name || '未知用户'
    }));

    return NextResponse.json(formattedFiles);
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}

// 上传文件到被审计单位
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const auditUnitId = params.id;
    
    // 检查被审计单位是否存在
    const auditUnit = await db.query.auditUnits.findFirst({
      where: eq(auditUnits.id, auditUnitId),
    });

    if (!auditUnit) {
      return NextResponse.json(
        { error: '被审计单位不存在' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const uploadedFiles = formData.getAll('files') as File[];
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: '没有上传文件' },
        { status: 400 }
      );
    }

    // 准备上传目录
    const uploadDir = join(process.cwd(), 'public', 'uploads', auditUnitId);
    
    // 确保目录存在
    await mkdir(uploadDir, { recursive: true });
    
    const savedFiles = [];
    
    for (const file of uploadedFiles) {
      const fileId = randomUUID();
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${fileId}.${fileExt}`;
      const filePath = join(uploadDir, fileName);
      
      // 保存文件到本地（实际生产环境应该使用云存储）
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      
      // 文件相对路径（用于访问）
      const publicPath = `/uploads/${auditUnitId}/${fileName}`;
      
      // 创建文件记录
      const newFile = await db.insert(files).values({
        name: fileName,
        originalName: file.name,
        filePath: publicPath,
        fileSize: BigInt(file.size),
        fileType: file.type,
        uploadDate: new Date(),
        userId: user.id,
        auditUnitId: auditUnitId,
        isAnalyzed: false
      }).returning();
      
      if (newFile[0]) {
        savedFiles.push({
          id: newFile[0].id,
          filename: newFile[0].originalName,
          size: Number(newFile[0].fileSize),
          type: newFile[0].fileType,
          url: newFile[0].filePath,
          createdAt: newFile[0].uploadDate?.toISOString() || new Date().toISOString()
        });
      }
    }
    
    return NextResponse.json({ files: savedFiles });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      { error: '上传文件失败' },
      { status: 500 }
    );
  }
} 