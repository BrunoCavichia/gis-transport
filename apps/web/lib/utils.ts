import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Driver } from "@gis/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a driver is truly available for assignment.
 * A driver is considered available if:
 * 1. isAvailable is explicitly true
 * 2. currentVehicleId is null or undefined (no orphaned assignments)
 * 
 * This prevents assigning drivers who are marked as available but have
 * stale vehicle assignments from deleted or changed vehicles.
 */
export function isDriverTrulyAvailable(driver: Driver): boolean {
  return (
    driver.isAvailable === true &&
    (!driver.currentVehicleId || driver.currentVehicleId === null)
  );
}
/**
 * Checks if a driver is currently available.
 * Returns the isAvailable flag value directly.
 */
export function getDriverIsAvailable(driver: Driver): boolean {
  return driver.isAvailable === true;
}

/**
 * Gets the driver's on-time delivery rate.
 * Returns a percentage value (0-100).
 */
export function getDriverOnTimeRate(driver: Driver): number {
  return driver.onTimeDeliveryRate ?? 100;
}

/**
 * Gets the current vehicle assigned to a driver.
 * Returns the vehicle object if one exists, otherwise undefined.
 * Note: In this system, we use currentVehicleId but don't have full vehicle objects here.
 * This returns a minimal vehicle reference based on available data.
 */
export function getDriverCurrentVehicle(driver: Driver): { registration: string } | undefined {
  if (!driver.currentVehicleId) {
    return undefined;
  }
  
  // Return a minimal vehicle reference with the ID as registration
  // In a full implementation, this would fetch the actual vehicle from a vehicle repository
  return {
    registration: String(driver.currentVehicleId),
  };
}