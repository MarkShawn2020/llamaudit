import { UserProvider } from '@/lib/auth';
import { getUser } from '@/lib/db/queries';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: '智审 - AI 驱动的审计辅助系统',
  description: '基于 AI 的智能审计辅助系统，支持文件管理、信息抽取、合规性检查等功能。',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ['latin'] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 尝试获取用户，但不在客户端处理Promise
  let initialUser = null;
  try {
    initialUser = await getUser();
  } catch (error) {
    console.error("Error getting user:", error);
  }

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50" suppressHydrationWarning>
        <UserProvider initialUser={initialUser}>{children}</UserProvider>
        <Toaster />
      </body>
    </html>
  );
}
