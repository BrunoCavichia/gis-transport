import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db";

export async function GET() {
    try {
        const drivers = await repository.getDrivers();
        return NextResponse.json({ success: true, data: drivers });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const driver = await repository.addDriver(body);
        return NextResponse.json({ success: true, data: driver });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
