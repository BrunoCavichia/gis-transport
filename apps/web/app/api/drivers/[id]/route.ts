import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db";
import { FetchError } from "@/lib/types";

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
  } catch (err) {
    const error = err as FetchError;
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

    // BACKEND VALIDATION: If assigning to a vehicle, validate that it exists
    // This prevents creating orphaned drivers with non-existent vehicle references
    if (body.currentVehicleId && body.currentVehicleId !== null) {
      // In a real scenario, you would check against an actual vehicles repository
      // For now, we'll validate the format at minimum
      if (
        typeof body.currentVehicleId !== "string" &&
        typeof body.currentVehicleId !== "number"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid vehicle ID format. Must be string or number.",
          },
          { status: 400 },
        );
      }

      // Validate that if marking as unavailable, a vehicle is actually assigned
      if (body.isAvailable === false && !body.currentVehicleId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot mark driver as unavailable without assigning to a vehicle.",
          },
          { status: 400 },
        );
      }
    }

    // BACKEND VALIDATION: If marking as available, must clear vehicle assignment
    if (body.isAvailable === true && body.currentVehicleId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot mark driver as available while assigned to a vehicle. Clear the assignment first.",
        },
        { status: 400 },
      );
    }

    const driver = await repository.updateDriver(id, body);
    return NextResponse.json({ success: true, data: driver });
  } catch (err) {
    const error = err as FetchError;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
