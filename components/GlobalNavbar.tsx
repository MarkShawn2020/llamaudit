'use client';

import {navItems} from "@/components/nav-items";
import {UserMenu} from "@/components/user-menu";
import {useUser} from '@/components/user-provider';
import {cn} from '@/lib/utils';
import {ShieldAlertIcon} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Logo} from './logo';
import packageJson from '@/package.json';

// 管理员专用菜单项
const adminNavItems = [
  {
    name: '系统管理',
    href: '/admin/db',
    icon: ShieldAlertIcon
  }
];

export function GlobalNavbar() {
  const { user } = useUser();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

  const version = packageJson.version;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm  max-w-7xl mx-auto w-full border-0 border-b border-gray-200">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <Logo/>
            <span className="font-bold text-xl">智审大师</span>
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">{version}(α)</span>
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
