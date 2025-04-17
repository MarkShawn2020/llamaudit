import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { UserProvider } from '@/components/user-provider';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { getUser } from '@/lib/db/queries';
import { initializeStorageSystem } from '@/lib/actions/file-actions';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// 全局初始化状态标记
declare global {
  var storageInitialized: boolean | undefined;
}

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

    // 仅在首次加载时初始化存储系统
    if (!global.storageInitialized) {
      console.log('首次执行存储系统初始化');
      await initializeStorageSystem();
      global.storageInitialized = true;
    }
    
    // 获取初始用户信息
    initialUser = await getUser();

  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
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
