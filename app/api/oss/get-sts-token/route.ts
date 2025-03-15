import { STS } from 'ali-oss';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sts = new STS({
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET!,
    });


    // roleArn填写步骤2获取的角色ARN，例如acs:ram::175708322470****:role/ramtest。
   // policy填写自定义权限策略，用于进一步限制STS临时访问凭证的权限。如果不指定Policy，则返回的STS临时访问凭证默认拥有指定角色的所有权限。
   // 3000为过期时间，单位为秒。
   // sessionName用于自定义角色会话名称，用来区分不同的令牌，例如填写为sessiontest。
    const result = await sts.assumeRole(
      process.env.ALIBABA_CLOUD_STS_ROLE_ARN!,
      ``, 3000, 'oss-web-upload'
    );

    return NextResponse.json(result.credentials);
  } catch (error) {
    console.error('获取 STS Token 失败:', error);
    return NextResponse.json(
      { error: 'Failed to get STS token' },
      { status: 500 }
    );
  }
}   