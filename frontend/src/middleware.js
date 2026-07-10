import { NextResponse } from 'next/server';

export function middleware(request) {
    // 1. Get cookies
    const token = request.cookies.get('token')?.value;
    const role = request.cookies.get('userRole')?.value;

    // 2. Get the current path the user is trying to visit
    const { pathname } = request.nextUrl;

    // --- FIXED: ROUTE SEPARATION ENTITIES ---
    // Guest pages are exclusively for users who are logged out (they get redirected if logged in)
    const publicGuestRoutes = ['/login', '/register', '/verify-email', '/forgot-password'];
    
    // Shared public pages are viewable by both logged-out public users and logged-in operators
    const publicSharedRoutes = ['/', '/open-data']; 

    const isPublicGuestPage = publicGuestRoutes.includes(pathname);
    const isPublicSharedPage = publicSharedRoutes.includes(pathname);

    const isSuperAdminRoute = pathname.startsWith('/super-admin');
    const isCompanyRoute = pathname.startsWith('/company');

    // SCENARIO A: User is NOT logged in
    if (!token) {
        // Allow them to hit guest auth pipelines OR the public index/maps without restriction
        if (isPublicGuestPage || isPublicSharedPage) {
            return NextResponse.next();
        }
        // Redirect any unauthenticated hits on dashboards/settings straight to login gate
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // SCENARIO B: User IS logged in
    if (token) {
        // If they try to visit an auth gate page while already logged in, bounce them to their correct workspace
        if (isPublicGuestPage) {
            if (role === 'SUPER_ADMIN') {
                return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/company/dashboard', request.url));
            }
        }

        // SCENARIO C: Role-Based Guardrails (Prevents cross-dashboard jumping)
        if (isSuperAdminRoute && role !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL('/company/dashboard', request.url));
        }

        if (isCompanyRoute && role === 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // Match all request paths except for Next.js internal files, static assets, media uploads, and icons
    matcher: ['/((?!api|_next/static|_next/image|uploads|favicon.ico).*)'],
};