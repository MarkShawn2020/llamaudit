import OSS from 'ali-oss'
import { NextResponse } from 'next/server'

// 创建 OSS 客户端
const client = new OSS({
  region: process.env.NEXT_PUBLIC_OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.NEXT_PUBLIC_OSS_BUCKET!,
})

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json()
    
    // 生成上传签名 URL，有效期 3600 秒
    const url = await client.signatureUrl(filename, {
      method: 'PUT',
      'Content-Type': contentType,
      expires: 3600,
    })
    
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Failed to generate upload URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
} 