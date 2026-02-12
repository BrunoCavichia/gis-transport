import { z } from "zod";

// --- Schemas & Inferred Types ---

export const LatLonSchema = z.tuple([z.number(), z.number()]);
export type LatLon = z.infer<typeof LatLonSchema>;

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RoadInfoSchema = z.object({
  maxSpeed: z.number().optional(),
  roadName: z.string().optional(),
});
export type RoadInfo = z.infer<typeof RoadInfoSchema>;

// Domain - POI
export const POISchema = z.object({
  id: z.string(),
  name: z.string(),
  position: LatLonSchema,
  type: z.enum(["gas", "ev"]),
  brand: z.string().optional(),
  operator: z.string().optional(),
  address: z.string().optional(),
  town: z.string().optional(),
  postalCode: z.string().optional(),
  connectors: z.number().optional(),
  connectionTypes: z.array(z.string()).optional(),
  powerKW: z.number().optional(),
  status: z.string().optional(),
  isOperational: z.boolean().optional(),
  prices: z
    .object({
      gasoline95: z.number().optional(),
      gasoline98: z.number().optional(),
      diesel: z.number().optional(),
      dieselPremium: z.number().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});
export type POI = z.infer<typeof POISchema>;

export const CustomPOISchema = z.object({
  id: z.string(),
  name: z.string(),
  position: LatLonSchema.optional(), // For point POIs
  coordinates: z.any().optional(), // For polygon zones
  entityType: z.enum(["point", "zone"]).default("point"),
  type: z.literal("custom"),
  description: z.string().optional(),
  createdAt: z.number(),
  selectedForFleet: z.boolean().optional(),
  zoneType: z.string().optional(), // For zones: "LEZ", "RESTRICTED", etc.
  requiredTags: z.array(z.string()).optional(), // For zone access control
});
export type CustomPOI = z.infer<typeof CustomPOISchema>;

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  coordinates: z.any(), // Flexible for Polygon/MultiPolygon
  type: z.string().optional(),
  description: z.string().optional(),
  requiredTags: z.array(z.string()).optional(),
});
export type Zone = z.infer<typeof ZoneSchema>;

// Domain - Fleet
export const VehicleTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  tags: z.array(z.string()),
  vroomType: z.literal("car"),
});
export type VehicleType = z.infer<typeof VehicleTypeSchema>;

export const MovementStateSchema = z.enum(["stopped", "moving", "on_route"]);
export type MovementState = z.infer<typeof MovementStateSchema>;

export const VehicleStatusSchema = z.enum([
  "active",
  "idle",
  "maintenance",
  "offline",
]);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

export const SpeedingEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  speed: z.number(),
  limit: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  driverId: z.string(),
});
export type SpeedingEvent = z.infer<typeof SpeedingEventSchema>;

export const DriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  licenseType: z.string().optional(),
  licenseNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  onTimeDeliveryRate: z.number().min(0).max(100).default(100),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().optional(),
  currentVehicleId: z.union([z.string(), z.number()]).optional(),
  speedingEvents: z.array(SpeedingEventSchema).optional(),
});
export type Driver = z.infer<typeof DriverSchema>;

export const VehicleMetricsSchema = z.object({
  fuelLevel: z.number().min(0).max(100).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  distanceTotal: z.number(),
  speed: z.number(),
  maxSpeed: z.number().optional(),
  address: z.string().optional(),
  health: z.number().min(0).max(100),
  consumptionAverage: z.number().optional(),
  status: VehicleStatusSchema,
  movementState: MovementStateSchema,
  updatedAt: z.number(),
});
export type VehicleMetrics = z.infer<typeof VehicleMetricsSchema>;

export const FleetVehicleSummarySchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.string(),
  label: z.string(),
  position: LatLonSchema,
  licensePlate: z.string().optional(),
  driver: DriverSchema.optional(),
  metrics: VehicleMetricsSchema.optional(),
});
export type FleetVehicleSummary = z.infer<typeof FleetVehicleSummarySchema>;

export const FleetOverviewSchema = z.object({
  totalVehicles: z.number(),
  activeVehicles: z.number(),
  vehiclesByType: z.record(z.string(), z.number()),
  vehicles: z.array(FleetVehicleSummarySchema),
  kpis: z
    .object({
      averageFuel: z.number().optional(),
      averageBattery: z.number().optional(),
      totalDistance: z.number(),
      activeRate: z.number(),
      averageHealth: z.number(),
    })
    .optional(),
});
export type FleetOverview = z.infer<typeof FleetOverviewSchema>;

export const FleetVehicleSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: VehicleTypeSchema,
  label: z.string(),
  position: LatLonSchema,
  licensePlate: z.string().optional(),
  driver: DriverSchema.optional(),
  metrics: VehicleMetricsSchema.optional(),
});
export type FleetVehicle = z.infer<typeof FleetVehicleSchema>;

export const FleetJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  label: z.string(),
  position: LatLonSchema,
  requirements: z.array(z.string()).optional(),
  assignedVehicleId: z.union([z.string(), z.number()]).optional(),
  sequence: z.number().optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "failed"])
    .default("pending"),
  estimatedArrival: z.string().optional(),
  completedAt: z.number().optional(),
  source: z.enum(["vroom", "custom_stop"]).default("vroom"),
});
export type FleetJob = z.infer<typeof FleetJobSchema>;

// Domain - Optimization & Weather
export const RouteSummarySchema = z.object({
  vehicleId: z.union([z.string(), z.number()]),
  jobsAssigned: z.number(),
  distanceFormatted: z.string(),
  durationFormatted: z.string(),
  startPoint: LatLonSchema,
  endPoint: LatLonSchema,
});
export type RouteSummary = z.infer<typeof RouteSummarySchema>;

export const OptimizationSummarySchema = z.object({
  status: z.enum(["idle", "optimized", "error"]),
  lastOptimizedAt: z.string().optional(),
  totalJobs: z.number(),
  assignedJobs: z.number(),
  unassignedJobs: z.number(),
  routes: z.array(RouteSummarySchema),
  totals: z.object({
    distanceFormatted: z.string(),
    durationFormatted: z.string(),
  }),
});
export type OptimizationSummary = z.infer<typeof OptimizationSummarySchema>;

export const WeatherAlertSummarySchema = z.object({
  vehicleId: z.union([z.string(), z.number()]),
  event: z.string(),
  severity: RiskLevelSchema,
  location: LatLonSchema,
  message: z.string(),
  timeWindow: z.string(),
});
export type WeatherAlertSummary = z.infer<typeof WeatherAlertSummarySchema>;

export const WeatherSummarySchema = z.object({
  overallRisk: RiskLevelSchema,
  alertCount: z.number(),
  alertsByType: z.record(z.string(), z.number()),
  affectedRoutes: z.number(),
  alerts: z.array(WeatherAlertSummarySchema),
});
export type WeatherSummary = z.infer<typeof WeatherSummarySchema>;

export const GisDashboardDataSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
  }),
  fleet: FleetOverviewSchema,
  optimization: OptimizationSummarySchema,
  weather: WeatherSummarySchema,
  analytics: z.record(z.string(), z.unknown()).optional(),
});
export type GisDashboardData = z.infer<typeof GisDashboardDataSchema>;

export const VehicleRouteSchema = z.object({
  vehicleId: z.union([z.string(), z.number()]),
  coordinates: z.array(LatLonSchema),
  distance: z.number(),
  duration: z.number(),
  color: z.string(),
  jobsAssigned: z.number(),
  assignedJobIds: z.array(z.union([z.string(), z.number()])).optional(), // IDs of jobs assigned to this route
  error: z.string().optional(),
});
export type VehicleRoute = z.infer<typeof VehicleRouteSchema>;

export const WeatherMarkerSchema = z.object({
  vehicleId: z.union([z.string(), z.number()]),
  segmentIndex: z.number(),
  coords: LatLonSchema,
  icon: z.string(),
  message: z.string(),
  timeWindow: z.string(),
});
export type WeatherMarker = z.infer<typeof WeatherMarkerSchema>;

export const WeatherAlertSchema = z.object({
  segmentIndex: z.number(),
  event: z.enum(["SNOW", "RAIN", "ICE", "WIND", "FOG", "HEAT", "COLD"]),
  severity: RiskLevelSchema,
  timeWindow: z.string(),
  message: z.string(),
  lat: z.number(),
  lon: z.number(),
});
export type WeatherAlert = z.infer<typeof WeatherAlertSchema>;

export const RouteWeatherSchema = z.object({
  vehicle: z.union([z.string(), z.number()]),
  riskLevel: RiskLevelSchema,
  alerts: z.array(WeatherAlertSchema),
});
export type RouteWeather = z.infer<typeof RouteWeatherSchema>;

export const RouteNoticeSchema = z.object({
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "warning", "success"]),
});
export type RouteNotice = z.infer<typeof RouteNoticeSchema>;

export const RouteDataSchema = z.object({
  coordinates: z.array(LatLonSchema),
  distance: z.number(),
  duration: z.number(),
  waypoints: z
    .array(
      z.object({
        name: z.string().optional(),
        location: LatLonSchema,
      }),
    )
    .optional(),
  vehicleRoutes: z.array(VehicleRouteSchema).optional(),
  weatherRoutes: z.array(RouteWeatherSchema).optional(),
  weatherMarkers: z.array(WeatherMarkerSchema).optional(),
  unassignedJobs: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  notices: z.array(RouteNoticeSchema).optional(),
  avoidPolygons: z.array(z.array(LatLonSchema)).optional(),
});
export type RouteData = z.infer<typeof RouteDataSchema>;

export const WeatherDataSchema = z.object({
  location: z.string().optional(),
  temperature: z.number(),
  condition: z.string(),
  description: z.string(),
  humidity: z.number(),
  windSpeed: z.number(),
  alerts: z.array(z.string()).optional(),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

export const RawWeatherDataSchema = z.object({
  main: z
    .object({
      temp: z.number().optional(),
    })
    .optional(),
  rain: z
    .object({
      "3h": z.number().optional(),
    })
    .optional(),
  snow: z
    .object({
      "3h": z.number().optional(),
    })
    .optional(),
  wind: z
    .object({
      speed: z.number().optional(),
    })
    .optional(),
  visibility: z.number().optional(),
  dt: z.number(),
});
export type RawWeatherData = z.infer<typeof RawWeatherDataSchema>;

export const LayerVisibilitySchema = z.object({
  gasStations: z.boolean(),
  evStations: z.boolean(),
  cityZones: z.boolean(),
  route: z.boolean(),
});
export type LayerVisibility = z.infer<typeof LayerVisibilitySchema>;

// VROOM Schemas
export const VroomStepSchema = z.object({
  type: z.enum(["start", "job", "end"]),
  location_index: z.number().optional(),
  id: z.number().optional(),
  service: z.number().optional(),
  arrival: z.number().optional(),
  duration: z.number().optional(),
  distance: z.number().optional(),
});
export type VroomStep = z.infer<typeof VroomStepSchema>;

export const VroomRouteSchema = z.object({
  vehicle: z.number(),
  steps: z.array(VroomStepSchema),
  cost: z.number(),
  duration: z.number(),
  distance: z.number(),
});
export type VroomRoute = z.infer<typeof VroomRouteSchema>;

export const VroomUnassignedSchema = z.object({
  id: z.number(),
  location: LatLonSchema.optional(),
});
export type VroomUnassigned = z.infer<typeof VroomUnassignedSchema>;

export const VroomResultSchema = z.object({
  code: z.number(),
  routes: z.array(VroomRouteSchema),
  unassigned: z.array(VroomUnassignedSchema).optional(),
  summary: z.object({
    cost: z.number(),
    unassigned: z.number(),
    service: z.number(),
    duration: z.number(),
    distance: z.number(),
  }),
});
export type VroomResult = z.infer<typeof VroomResultSchema>;

// ORS Schemas
export const OrsMatrixResponseSchema = z.object({
  distances: z.array(z.array(z.number())).optional(),
  durations: z.array(z.array(z.number())).optional(),
  destinations: z.array(
    z.object({
      location: z.tuple([z.number(), z.number()]),
      snapped_distance: z.number(),
    }),
  ),
  sources: z.array(
    z.object({
      location: z.tuple([z.number(), z.number()]),
      snapped_distance: z.number(),
    }),
  ),
});
export type OrsMatrixResponse = z.infer<typeof OrsMatrixResponseSchema>;

export const OrsDirectionsResponseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.array(z.tuple([z.number(), z.number()])),
        type: z.string(),
      }),
      properties: z.object({
        summary: z.object({
          distance: z.number(),
          duration: z.number(),
        }),
      }),
    }),
  ),
});
export type OrsDirectionsResponse = z.infer<typeof OrsDirectionsResponseSchema>;

// External API Schemas
export const NominatimAddressSchema = z.object({
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  municipality: z.string().optional(),
  road: z.string().optional(),
  house_number: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  county: z.string().optional(),
});
export type NominatimAddress = z.infer<typeof NominatimAddressSchema>;

export const NominatimResultSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  address: NominatimAddressSchema,
  osm_id: z.number(),
});
export type NominatimResult = z.infer<typeof NominatimResultSchema>;

export const GeocodingResultSchema = z.object({
  point: z.object({ lat: z.number(), lng: z.number() }),
  name: z.string(),
  country: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  street: z.string().optional(),
  housenumber: z.string().optional(),
  osm_id: z.union([z.number(), z.string()]).optional(),
});
export type GeocodingResult = z.infer<typeof GeocodingResultSchema>;

export const OverpassGeometrySchema = z.object({
  lat: z.number(),
  lon: z.number(),
});
export type OverpassGeometry = z.infer<typeof OverpassGeometrySchema>;

export const OverpassElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: OverpassGeometrySchema.optional(),
  geometry: z.array(OverpassGeometrySchema).optional(),
  tags: z.record(z.string()).optional(),
  members: z
    .array(
      z.object({
        type: z.string(),
        ref: z.number(),
        role: z.string(),
        geometry: z.array(OverpassGeometrySchema).optional(),
      }),
    )
    .optional(),
});
export type OverpassElement = z.infer<typeof OverpassElementSchema>;

export const OverpassResponseSchema = z.object({
  elements: z.array(OverpassElementSchema),
});
export type OverpassResponse = z.infer<typeof OverpassResponseSchema>;

export const SearchPOIParamsSchema = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().min(100).max(100000).default(5000),
  limit: z.coerce.number().min(1).max(200).default(100),
});
export type SearchPOIParams = z.infer<typeof SearchPOIParamsSchema>;

export const OptimizeOptionsSchema = z.object({
  startTime: z.string().optional(),
  zones: z.array(ZoneSchema).optional(),
});
export type OptimizeOptions = z.infer<typeof OptimizeOptionsSchema>;

// Final Context Schema
export const GisOptimizationContextSchema = z.object({
  fleet: z.object({
    vehicles: z.array(FleetVehicleSchema),
  }),
  jobs: z.array(FleetJobSchema),
  weather: WeatherSummarySchema.optional(),
  settings: z
    .object({
      avoidZones: z.boolean(),
      considerWeather: z.boolean(),
    })
    .optional(),
});
export type GisOptimizationContext = z.infer<
  typeof GisOptimizationContextSchema
>;

// Generic API Response Interface
export interface IGisResponse<T = unknown> {
  timestamp: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// Additional API Schemas
export const WeatherIncomingBodySchema = z.object({
  startTime: z.string().optional(),
  vehicleRoutes: z.array(VehicleRouteSchema).optional(),
  vehicles: z.array(FleetVehicleSchema).optional(),
  jobs: z.array(FleetJobSchema).optional(),
  locations: z.array(LatLonSchema).optional(),
  matrix: z.array(z.array(z.number())).optional(),
});
export type WeatherIncomingBody = z.infer<typeof WeatherIncomingBodySchema>;

export const GisDataContextSchema = z.record(z.string(), z.any());
export type GisDataContext = z.infer<typeof GisDataContextSchema>;

export * from "./overpass-client";
