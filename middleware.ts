/**
 * 🛡️ Middleware: التحقق من الجلسات والصلاحيات
 */

import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // المسارات التي تتطلب مصادقة
  const protectedPaths = ['/dashboard', '/courses', '/lessons', '/profile'];
  const adminPaths = ['/admin'];
  const adminApiPaths = ['/api/admin'];

  const isProtectedPath = protectedPaths.some((p) => path.startsWith(p));
  const isAdminPath = adminPaths.some((p) => path.startsWith(p));
  const isAdminApiPath = adminApiPaths.some((p) => path.startsWith(p));

  if (isProtectedPath || isAdminPath || isAdminApiPath) {
    // 1. استخراج التوكن
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. التحقق من صحة الجلسة عبر API (Node runtime)
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || '';

    const verifyResponse = await fetch(new URL('/api/auth/session/verify', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, userAgent, ipAddress }),
      cache: 'no-store',
    });

    const sessionCheck = verifyResponse.ok
      ? await verifyResponse.json()
      : { valid: false, userId: undefined };

    if (!sessionCheck.valid) {
      // حذف الكوكيز وإعادة التوجيه
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_token');
      return response;
    }

    // 4. التحقق من صلاحيات الأدمن
    if (isAdminPath || isAdminApiPath) {
      if (sessionCheck.role !== 'ADMIN') {
        if (isAdminApiPath) {
          return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // 5. التحقق من صلاحيات الطالب لمسارات لوحة الطالب
    if (isProtectedPath) {
      if (sessionCheck.role !== 'STUDENT') {
        if (sessionCheck.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // إضافة معرف المستخدم للهيدر (يمكن استخدامه في API Routes)
    const response = NextResponse.next();
    response.headers.set('x-user-id', sessionCheck.userId || '');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/lessons/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/api/admin/:path*',
  ],
};
