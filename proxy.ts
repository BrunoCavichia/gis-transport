import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {

    if (request.nextUrl.pathname.startsWith('/api/v1/')) {
        const apiKey = request.headers.get('x-api-key');
        const validKey = process.env.GIS_API_KEY;

        if (!validKey) {
            return NextResponse.json(
                { success: false, error: { code: 'CONFIG_ERROR', message: 'API key not configured' } },
                { status: 500 }
            );
        }

        if (!apiKey || apiKey !== validKey) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } },
                { status: 401 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/v1/:path*',
};
