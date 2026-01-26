import { NextResponse } from 'next/server';
import { GisDataService } from '@/lib/services/gis-data-service';
import { GisDataContext } from '@/lib/types/dashboard';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Basic validation could go here
        const context: GisDataContext = data;

        const id = await GisDataService.saveSnapshot(context);

        return NextResponse.json({ success: true, id });
    } catch (err) {
        console.error("Error saving snapshot:", err);
        return NextResponse.json(
            { success: false, error: 'Failed to save snapshot' },
            { status: 500 }
        );
    }
}
