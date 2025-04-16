import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义受保护的路由前缀
const protectedRoutes = '/dashboard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  // 如果访问受保护路由但没有会话cookie，重定向到登录页
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // 简化处理逻辑，不再尝试延长会话有效期
  // 让后端处理session验证，这样可以避免在middleware中处理JWT
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
