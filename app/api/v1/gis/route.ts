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

        return NextResponse.json(successResponse(dashboardData));
    } catch (err) {
        return NextResponse.json(
            errorResponse('INTERNAL_ERROR', 'Failed to fetch GIS data', String(err)),
            { status: 500 }
        );
    }
}
