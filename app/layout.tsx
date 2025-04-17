import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/components/user-provider';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { getUser } from '@/lib/db/queries';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '审计系统',
  description: '提供安全可靠的审计体验',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null

  // 获取初始用户信息
  initialUser = await getUser();

  // 客户端初始化服务
  const initScript = `
    (async function() {
      try {
        // 只在客户端环境下异步触发一次初始化
        const res = await fetch('/api/system/initialize', { cache: 'force-cache' });
        console.log('系统初始化状态:', res.ok ? '成功' : '失败');
      } catch (e) {
        console.error('系统初始化请求失败:', e);
      }
    })();
  `;

  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <script 
          dangerouslySetInnerHTML={{ __html: initScript }} 
          id="system-init"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider initialUser={initialUser}>
            <div className="flex min-h-screen flex-col">
              <GlobalNavbar />
              <main className="flex-1">{children}</main>
            </div>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
