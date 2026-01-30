import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Since we don't have a getDriver method, we'll fetch all and filter
    const drivers = await repository.getDrivers();
    const driver = drivers.find((d) => d.id === id);

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Driver not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: driver });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const driver = await repository.updateDriver(id, body);
    return NextResponse.json({ success: true, data: driver });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
