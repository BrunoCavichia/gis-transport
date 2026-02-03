import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Driver, VehicleMetrics, RouteWeather, WeatherAlert } from "@gis/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ALERT SYSTEM - Unified & Extensible
// ============================================

export type AlertCategory = "vehicle" | "weather" | "route" | "delivery";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "speeding"
  | "low_fuel"
  | "low_battery"
  | "maintenance"
  | "off_route"
  | "weather"
  | "delay";

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  vehicleId?: string | number;
  data?: Record<string, any>;
}

/**
 * Generates vehicle operational alerts based on current telemetry metrics.
 * Extensible system: add new alert types here as telemtry becomes available.
 *
 * Current alerts:
 * - Speeding: When speed exceeds road limit (critical if >20 km/h excess, warning otherwise)
 *
 * Future alerts (placeholder):
 * - Low Fuel: When fuel level drops below threshold
 * - Low Battery: When EV battery level drops below threshold
 * - Maintenance: When vehicle health is below threshold
 */
export function generateVehicleAlerts(
  vehicleId: string | number,
  metrics: VehicleMetrics | null,
  maxSpeed?: number,
  weatherData?: RouteWeather,
): Alert[] {
  const alerts: Alert[] = [];

  if (!metrics) return alerts;

  const now = Date.now();
  const speed = metrics.speed || 0;

  // Use provided maxSpeed, or default to 60 km/h if not available
  const speedLimit = maxSpeed || 60;

  // SPEEDING ALERT - Current implementation
  if (speed > speedLimit) {
    const excess = speed - speedLimit;
    const isCritical = excess > 20;

    alerts.push({
      id: `speeding-${vehicleId}-${now}`,
      type: "speeding",
      category: "vehicle",
      severity: isCritical ? "critical" : "warning",
      title: "Exceso de Velocidad",
      message: `El vehículo supera el límite en ${Math.round(excess)} km/h (${speed} km/h vs ${speedLimit} km/h permitido)`,
      timestamp: now,
      vehicleId,
      data: { currentSpeed: speed, speedLimit, excess },
    });
  }

  // PLACEHOLDER: Low Fuel - Will be enabled with official telemtry
  if (metrics.fuelLevel !== undefined && metrics.fuelLevel < 20) {
    alerts.push({
      id: `low-fuel-${vehicleId}-${now}`,
      type: "low_fuel",
      category: "vehicle",
      severity: metrics.fuelLevel < 10 ? "critical" : "warning",
      title: "Combustible Bajo",
      message: `Nivel de combustible: ${Math.round(metrics.fuelLevel)}%`,
      timestamp: now,
      vehicleId,
      data: { fuelLevel: metrics.fuelLevel },
    });
  }

  // PLACEHOLDER: Low Battery - Will be enabled with official telemtry
  if (metrics.batteryLevel !== undefined && metrics.batteryLevel < 20) {
    alerts.push({
      id: `low-battery-${vehicleId}-${now}`,
      type: "low_battery",
      category: "vehicle",
      severity: metrics.batteryLevel < 10 ? "critical" : "warning",
      title: "Batería Baja",
      message: `Nivel de batería: ${Math.round(metrics.batteryLevel)}%`,
      timestamp: now,
      vehicleId,
      data: { batteryLevel: metrics.batteryLevel },
    });
  }

  // PLACEHOLDER: Low Health - Will be enabled with official telemtry
  if (metrics.health < 50) {
    alerts.push({
      id: `low-health-${vehicleId}-${now}`,
      type: "maintenance",
      category: "vehicle",
      severity: metrics.health < 30 ? "critical" : "warning",
      title: "Mantenimiento Necesario",
      message: `Salud del vehículo: ${Math.round(metrics.health)}%`,
      timestamp: now,
      vehicleId,
      data: { health: metrics.health },
    });
  }

  // WEATHER ALERTS - Merged from weather routes
  if (weatherData && weatherData.alerts) {
    weatherData.alerts.forEach((wa, index) => {
      alerts.push({
        id: `weather-${vehicleId}-${wa.event}-${index}`,
        type: "weather",
        category: "weather",
        severity:
          wa.severity === "HIGH"
            ? "critical"
            : wa.severity === "MEDIUM"
              ? "warning"
              : "info",
        title: `Clima: ${wa.event}`,
        message: wa.message,
        timestamp: Date.parse(wa.timeWindow) || now,
        vehicleId,
        data: { wa },
      });
    });
  }

  return alerts;
}

/**
 * Utility to determine alert styling based on severity and category
 */
export function getAlertStyles(
  severity: AlertSeverity,
  category: AlertCategory = "vehicle",
) {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-50/30",
        border: "border-red-100/50",
        badge: "bg-red-500/10 text-red-600",
        icon: "text-red-600",
        banner: "bg-red-600 text-white",
      };
    case "warning":
      return {
        bg: "bg-amber-50/30",
        border: "border-amber-100/50",
        badge: "bg-amber-500/10 text-amber-600",
        icon: "text-amber-600",
        banner: "bg-amber-500 text-white",
      };
    case "info":
    default:
      return {
        bg: "bg-blue-50/30",
        border: "border-blue-100/50",
        badge: "bg-blue-500/10 text-blue-600",
        icon: "text-blue-600",
        banner: "bg-blue-500 text-white",
      };
  }
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
export function getDriverCurrentVehicle(
  driver: Driver,
): { registration: string } | undefined {
  if (!driver.currentVehicleId) {
    return undefined;
  }

  // Return a minimal vehicle reference with the ID as registration
  // In a full implementation, this would fetch the actual vehicle from a vehicle repository
  return {
    registration: String(driver.currentVehicleId),
  };
}
