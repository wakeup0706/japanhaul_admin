import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    console.log('Middleware - pathname:', pathname);

    // Protect admin routes (with or without language prefix)
    if (pathname.startsWith('/admin') || pathname.match(/^\/[a-z]{2}\/admin/)) {
        console.log('Middleware - protecting admin route');

        // Allow access to login pages
        if (pathname.endsWith('/admin/login')) {
            console.log('Middleware - allowing access to login page');
            return NextResponse.next();
        }

        // For protected admin routes, redirect to appropriate login page
        // Extract language prefix if present
        const langMatch = pathname.match(/^\/([a-z]{2})\//);
        const lang = langMatch ? langMatch[1] : 'en'; // Default to English if no language prefix
        console.log('Middleware - detected language:', lang);

        // Create login URL with proper language prefix
        const loginUrl = new URL(`/${lang}/admin/login`, request.url);
        console.log('Middleware - redirecting to:', loginUrl.toString());

        if (pathname !== `/${lang}/admin/login`) {
            loginUrl.searchParams.set('redirect', pathname);
        }

        return NextResponse.redirect(loginUrl);
    }

    // Protect checkout routes (with or without language prefix)
    if (pathname.endsWith('/checkout') || pathname.match(/^\/[a-z]{2}\/checkout$/)) {
        console.log('Middleware - protecting checkout route');

        // For protected checkout routes, redirect to appropriate login page
        // Extract language prefix if present
        const langMatch = pathname.match(/^\/([a-z]{2})\//);
        const lang = langMatch ? langMatch[1] : 'en'; // Default to English if no language prefix
        console.log('Middleware - detected language:', lang);

        // Create login URL with proper language prefix
        const loginUrl = new URL(`/${lang}/login`, request.url);
        console.log('Middleware - redirecting to:', loginUrl.toString());

        if (pathname !== `/${lang}/login`) {
            loginUrl.searchParams.set('redirect', pathname);
            loginUrl.searchParams.set('message', 'Please login to access checkout');
        }

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/:lang/checkout',
        '/checkout',
    ],
};
