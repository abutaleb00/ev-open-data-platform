import { NextResponse } from 'next/server';

export function proxy(request) {
    // 1. Get cookies
    const token = request.cookies.get('token')?.value;
    const role = request.cookies.get('userRole')?.value;

    // 2. Get current path
    const { pathname } = request.nextUrl;

    const publicGuestRoutes = ['/login', '/register', '/verify-email', '/forgot-password'];
    const publicSharedRoutes = ['/', '/open-data'];

    const isPublicGuestPage = publicGuestRoutes.includes(pathname);
    const isPublicSharedPage = publicSharedRoutes.includes(pathname);

    const isSuperAdminRoute = pathname.startsWith('/super-admin');
    const isCompanyRoute = pathname.startsWith('/company');

    // SCENARIO A: Unauthenticated Users
    if (!token) {
        if (isPublicGuestPage || isPublicSharedPage) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // SCENARIO B: Authenticated Users
    if (token) {
        if (isPublicGuestPage) {
            if (role === 'SUPER_ADMIN') {
                return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
            } else {
                return NextResponse.redirect(new URL('/company/dashboard', request.url));
            }
        }

        // SCENARIO C: Role Access Guardrails
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
    matcher: ['/((?!api|_next/static|_next/image|uploads|favicon.ico).*)'],
};