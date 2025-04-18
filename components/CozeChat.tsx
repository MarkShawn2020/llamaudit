'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import dotenv from 'dotenv';

dotenv.config();

export function CozeChat() {
  useEffect(() => {
    // 确保脚本加载完成后初始化Coze客户端
    const initCozeClient = () => {
      const pat = process.env.NEXT_PUBLIC_COZE_PAT;
      console.log({pat});
      

      if (typeof window !== 'undefined' && window.CozeWebSDK) {
        new window.CozeWebSDK.WebChatClient({
          config: {
            bot_id: '7494593121989672975',
          },
          componentProps: {
            title: 'Coze',
          },
          auth: {
            type: 'token',
            token: pat,
            onRefreshToken: function () {
              return pat
            }
          }
        });
      }
    };

    // 如果CozeWebSDK已经加载，则直接初始化
    if (typeof window !== 'undefined' && window.CozeWebSDK) {
      initCozeClient();
    }
    
    // 为脚本加载完成添加一个事件监听器
    window.addEventListener('CozeSDKLoaded', initCozeClient);
    
    return () => {
      window.removeEventListener('CozeSDKLoaded', initCozeClient);
    };
  }, []);

  return (
    <>
      <Script
        src="https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.6/libs/cn/index.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.dispatchEvent(new Event('CozeSDKLoaded'));
        }}
      />
    </>
  );
}

// 添加全局类型声明
declare global {
  interface Window {
    CozeWebSDK: any;
  }
} 