'use client';

import { useUser } from '@/components/user-provider';
import { cn } from '@/lib/utils';
import { CircleIcon, SettingsIcon, FolderIcon, BarChartIcon, HomeIcon, LogOut, ShieldAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const navItems = [
  {
    name: '首页',
    href: '/',
    icon: HomeIcon
  },
  {
    name: '项目管理',
    href: '/projects',
    icon: FolderIcon
  },
  {
    name: '分析系统',
    href: '/dashboard',
    icon: BarChartIcon
  },
  {
    name: '设置',
    href: '/settings',
    icon: SettingsIcon
  }
];

// 管理员专用菜单项
const adminNavItems = [
  {
    name: '系统管理',
    href: '/admin/db',
    icon: ShieldAlertIcon
  }
];

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, setUser } = useUser();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    setUser(null);
    router.refresh();
    router.push('/');
  }

  if (!user) {
    return (
      <Button
        asChild
        className="bg-primary text-white hover:bg-primary/90 text-sm px-4 py-2 rounded-full"
      >
        <Link href="/sign-in">登录</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email ? 
              user.email
                .split('@')[0]
                .charAt(0)
                .toUpperCase()
              : '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="font-medium text-sm py-2 px-4 text-gray-500" disabled>
          {user.email}
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GlobalNavbar() {
  const { user } = useUser();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';


  return (
    <header className="sticky top-0 z-50 border-b border-gray-200  max-w-7xl mx-auto w-full">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <Image src="/nau-colors-logo.svg" alt="智审 Logo" width={36} height={36} />
            <span className="font-bold text-xl">智审</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 ml-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname?.startsWith(item.href));
                
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary gap-1.5 px-3 py-2 rounded-md",
                    isActive 
                      ? "text-primary bg-primary/5" 
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            
            {/* 管理员菜单项 */}
            {isAdmin && adminNavItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname?.startsWith(item.href));
                
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary gap-1.5 px-3 py-2 rounded-md",
                    isActive 
                      ? "text-red-600 bg-red-50" 
                      : "text-red-600/80"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* 用户菜单 */}
        <div className="flex items-center">
          <UserMenu />
        </div>
      </div>
    </header>
  );
} 