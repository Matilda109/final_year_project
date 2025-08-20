import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function runs before requests to dashboard routes
export async function middleware(request: NextRequest) {
  // Check for various Supabase auth cookies
  const hasSessionCookie = request.cookies.has('sb-access-token') ||
                          request.cookies.has('sb-refresh-token') ||
                          request.cookies.has('supabase-auth-token');

  // Additional check for local storage keys (less reliable but can help)
  const url = new URL(request.url);
  const hasSessionParam = url.searchParams.has('hasSession');
  
  // If no session exists, redirect to login page with the return URL
  if (!hasSessionCookie && !hasSessionParam) {
    console.log('No session found, redirecting to login');
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User has a session, allow request to proceed
  return NextResponse.next();
}

// Configure middleware to only run on dashboard routes
export const config = {
  matcher: [
    '/admin/studentdashboard/:path*',
    '/admin/supervisordashboard/:path*',
    '/admin/admindashboard/:path*',
  ],
}; 