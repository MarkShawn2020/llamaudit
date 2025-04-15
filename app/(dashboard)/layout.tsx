'use client';

import { signOut } from '@/app/(login)/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/lib/auth';
import { Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

// 仅保留用户菜单功能，可能在全局导航右侧使用
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
        className="bg-white text-primary hover:bg-gray-100 text-sm px-4 py-2 rounded-full"
      >
        <Link href="/sign-in">登录</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9 ring-2 ring-white">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-white text-primary">
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
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>工作台</span>
          </Link>
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-6">
      {children}
    </div>
  );
}
