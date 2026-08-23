import { NextResponse } from 'next/server';

// NOTE: This file correctly follows Next.js 16's `proxy.js` convention (the renamed
// successor to `middleware.js` - see the "Migration to Proxy" section of the Next.js
// docs). However, `next.config.mjs` sets `output: 'export'`, and Proxy/Middleware is
// NOT supported in static export mode - `next build` prints a warning to this effect
// and the exported static bundle never executes this file at request time. As long as
// static export is the deployment target, the redirect/role-gating logic below is
// inert; the real, enforced route protection is the client-side check in
// src/app/(dashboard)/layout.jsx plus backend API authorization. If the deployment
// model ever moves off static export (e.g. `next start` on a Node server), this file
// starts working exactly as written with no changes needed.
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