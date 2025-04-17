import { signToken, verifyToken } from '@/lib/auth/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const protectedRoutes = '/dashboard';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = pathname.startsWith(protectedRoutes);

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie && request.method === "GET") {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString(),
        }),
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: expiresInOneDay,
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }

  // 检查是否已经初始化过
  if (!request.cookies.has('system_initialized')) {
    // 在Cookie中记录已初始化标记
    res.cookies.set('system_initialized', 'true', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30天
      path: '/',
    });
    
    // 设置X-Initialize请求头，触发服务器端初始化
    res.headers.set('X-Initialize-System', 'true');
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
