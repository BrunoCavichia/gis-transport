import { NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { GisDataService } from '@/lib/services/gis-data-service';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const dashboardData = await GisDataService.getLatestSnapshot();

        if (!dashboardData) {
            return NextResponse.json(
                errorResponse('NO_DATA', 'No optimization data available yet.'),
                { status: 404 }
            );
        }

        // Generate ETag based on valid generatedAt timestamp
        // We use a simple Weak ETag format: W/"<timestamp-epoch>"
        const etag = `W/"${new Date(dashboardData.meta.generatedAt).getTime().toString()}"`;

        // Check for Conditional Request
        const ifNoneMatch = request.headers.get('if-none-match');

        if (ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304 });
        }

        const response = NextResponse.json(successResponse(dashboardData));
        response.headers.set('ETag', etag);
        response.headers.set('Cache-Control', 'private, must-revalidate, max-age=10'); // Client checks every 10s max

        return response;
    } catch (err) {
        return NextResponse.json(
            errorResponse('INTERNAL_ERROR', 'Failed to fetch GIS data', String(err)),
            { status: 500 }
        );
    }
}
