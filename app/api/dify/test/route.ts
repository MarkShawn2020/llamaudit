import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey, datasetApiKey, type } = await request.json();

    if (!baseUrl || (!apiKey && !datasetApiKey) || !type) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    let testUrl: string;
    let headers: HeadersInit;

    if (type === 'app') {
      testUrl = `${baseUrl}/chat-messages`;
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    } else if (type === 'dataset') {
      testUrl = `${baseUrl}/datasets`;
      headers = {
        'Authorization': `Bearer ${datasetApiKey}`,
        'Content-Type': 'application/json',
      };
    } else {
      return NextResponse.json(
        { error: '无效的测试类型' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: type === 'app' ? 'App API Key 连接成功' : 'Dataset API Key 连接成功',
          status: response.status,
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          message: `连接失败: ${response.status} ${response.statusText}`,
          error: errorText,
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          message: '连接超时 (10秒)',
        });
      }

      return NextResponse.json({
        success: false,
        message: `网络错误: ${fetchError.message}`,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `服务器错误: ${error.message}` },
      { status: 500 }
    );
  }
}