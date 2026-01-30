import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await req.json();
        const driver = await repository.updateDriver(id, body);
        return NextResponse.json({ success: true, data: driver });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
