/**
 * Zone Access Helper - Centralized logic for zone access validation
 * Used by both visualization (map-container) and routing (routing-service)
 *
 * UNIFIED LOGIC: Both LEZ zones and custom zones with requiredTags use the same rules:
 * - Rule 1: If zone requires specific tags, vehicle must have at least one
 * - Rule 2: If zone restricts access (LEZ/CUSTOM types), vehicle must have tags
 */

import type { Zone, VehicleType, FleetVehicle } from "@gis/shared";

/**
 * Check if a zone is forbidden for a vehicle based on required tags and vehicle type
 * @param vehicleTags The tags of the vehicle
 * @param zone The zone to check
 * @returns true if the zone is forbidden, false if allowed
 */
export function isZoneForbiddenForVehicle(
  vehicleTags: string[],
  zone: Zone,
): boolean {
  const type = (zone.type || "").toUpperCase();
  const hasRequiredTags = zone.requiredTags && zone.requiredTags.length > 0;

  // Rule 1: If zone has requiredTags, vehicle must have at least one of them
  // This applies to ALL zones: LEZ, CUSTOM, RESTRICTED, etc.
  if (hasRequiredTags && zone.requiredTags) {
    const hasRequiredTag = zone.requiredTags.some((tag) =>
      vehicleTags.includes(tag),
    );
    return !hasRequiredTag; // Forbidden if doesn't have required tag
  }

  // Pedestrian zones always forbidden
  if (type === "PEDESTRIAN") {
    return true;
  }

  // Rule 2: For zones that restrict access (LEZ/RESTRICTED/ENVIRONMENTAL/CUSTOM),
  // vehicle must have at least one tag (unless zone has specific requiredTags, handled above)
  if (
    ["RESTRICTED", "LEZ", "ENVIRONMENTAL", "CUSTOM"].includes(type) &&
    vehicleTags.length === 0
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a vehicle (by tags) can access a zone
 * Opposite of isZoneForbiddenForVehicle
 * @param vehicleTags The tags of the vehicle
 * @param zone The zone to check
 * @returns true if vehicle can access the zone, false if forbidden
 */
export function canVehicleAccessZone(
  vehicleTags: string[],
  zone: Zone,
): boolean {
  return !isZoneForbiddenForVehicle(vehicleTags, zone);
}

/**
 * Check if a VehicleType can access a zone
 * @param vehicleType The vehicle type
 * @param zone The zone to check
 * @returns true if vehicle type can access the zone
 */
export function canVehicleTypeAccessZone(
  vehicleType: VehicleType,
  zone: Zone,
): boolean {
  return canVehicleAccessZone(vehicleType.tags, zone);
}

/**
 * Check if a FleetVehicle can access a zone
 * @param vehicle The fleet vehicle
 * @param zone The zone to check
 * @returns true if vehicle can access the zone
 */
export function canFleetVehicleAccessZone(
  vehicle: FleetVehicle,
  zone: Zone,
): boolean {
  return canVehicleAccessZone(vehicle.type.tags, zone);
}

/**
 * Get all forbidden zones for a vehicle based on its tags
 * @param vehicleTags The tags of the vehicle
 * @param zones All available zones
 * @returns Array of zones that are forbidden for this vehicle
 */
export function getForbiddenZones(
  vehicleTags: string[],
  zones: Zone[],
): Zone[] {
  return zones.filter((zone) => isZoneForbiddenForVehicle(vehicleTags, zone));
}

/**
 * Get all accessible zones for a vehicle based on its tags
 * @param vehicleTags The tags of the vehicle
 * @param zones All available zones
 * @returns Array of zones that are accessible for this vehicle
 */
export function getAccessibleZones(
  vehicleTags: string[],
  zones: Zone[],
): Zone[] {
  return zones.filter((zone) => canVehicleAccessZone(vehicleTags, zone));
}

/**
 * Debug helper - explains why a zone is forbidden for a vehicle
 * @param vehicleTags The tags of the vehicle
 * @param zone The zone to check
 * @returns Reason if forbidden, empty string if accessible
 */
export function getZoneForbiddenReason(
  vehicleTags: string[],
  zone: Zone,
): string {
  const type = (zone.type || "").toUpperCase();
  const hasRequiredTags = zone.requiredTags && zone.requiredTags.length > 0;

  if (hasRequiredTags && zone.requiredTags) {
    const hasRequiredTag = zone.requiredTags.some((tag) =>
      vehicleTags.includes(tag),
    );
    if (!hasRequiredTag) {
      return `Vehicle lacks required tags [${zone.requiredTags.join(", ")}]`;
    }
  }

  if (type === "PEDESTRIAN") {
    return "Pedestrian zones are always forbidden";
  }

  if (
    ["RESTRICTED", "LEZ", "ENVIRONMENTAL", "CUSTOM"].includes(type) &&
    vehicleTags.length === 0
  ) {
    return `${type} zones require vehicle to have at least one tag`;
  }

  return "";
}
