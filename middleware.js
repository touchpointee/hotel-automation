import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/admin', '/api/bookings', '/api/rooms', '/api/calendar'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const token = request.cookies.get('auth_token')?.value;
  
  // LOGGING for debugging login redirection
  console.log(`[MW-DEBUG] path=${pathname} protected=${isProtected} hasToken=${!!token}`);

  if (!isProtected) return NextResponse.next();

  // API routes that are safe (kiosk, upload, checkin, etc.)
  const isPublicApi = [
    '/api/checkin',
    '/api/upload',
    '/api/floors',
    '/api/documents',
    '/api/auth',
  ].some((p) => pathname.startsWith(p));
  
  if (isPublicApi) return NextResponse.next();

  if (!token) {
    console.log(`[MW-DEBUG] Redirecting to /login (no token) from ${pathname}`);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    console.log(`[MW-DEBUG] Redirecting to /login (invalid token) from ${pathname}`);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
