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

export const metadata: Metadata = {
  title: '审计系统',
  description: '提供安全可靠的审计体验',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser;
  
  try {
    // 尝试初始化存储系统
    await initializeStorageSystem();
    
    // 获取初始用户信息
    initialUser = await getUser();
  } catch (error) {
    console.error('初始用户获取失败:', error);
    initialUser = null;
  }

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
