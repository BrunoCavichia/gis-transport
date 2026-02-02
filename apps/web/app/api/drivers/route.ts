import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db";
import { FetchError } from "@/lib/types";

export async function GET() {
  try {
    const drivers = await repository.getDrivers();
    return NextResponse.json({ success: true, data: drivers });
  } catch (err) {
    const error = err as FetchError;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Special action to clear all driver assignments
    if (body.action === "clear-assignments") {
      const drivers = await repository.getDrivers();
      const updates = drivers.map((driver) =>
        repository.updateDriver(driver.id, {
          isAvailable: true,
          currentVehicleId: null,
        }),
      );
      await Promise.all(updates);
      return NextResponse.json({
        success: true,
        message: "All driver assignments cleared",
        data: await repository.getDrivers(),
      });
    }

    // Regular driver creation
    // BACKEND VALIDATION: New drivers must start with no vehicle assignment
    if (body.currentVehicleId && body.currentVehicleId !== null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New drivers cannot be created with an existing vehicle assignment. Drivers start available with no assignment.",
        },
        { status: 400 },
      );
    }

    const driver = await repository.addDriver(body);
    return NextResponse.json({ success: true, data: driver });
  } catch (err) {
    const error = err as FetchError;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
