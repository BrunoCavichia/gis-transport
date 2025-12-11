export interface POI {
  id: string;
  name: string;
  position: [number, number];
  type: "gas" | "ev";
  brand?: string;
  operator?: string;
  address?: string;
  town?: string;
  connectors?: number;
  connectionTypes?: string[];
  powerKW?: number;
  status?: string;
  isOperational?: boolean;
  fuel_diesel?: boolean;
  fuel_octane_95?: boolean;
  fuel_octane_98?: boolean;
  opening_hours?: string;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: [number, number][];
  type?: string;
  description?: string;

  requiredTags?: string[];

  boundary?: string; // "low_emission_zone"
  zone?: string; // "low_emission"
  access?: string; // "no", "permissive", "destination"
  motor_vehicle?: string; // same values as access
  motorcar?: string;
  vehicle?: string;
  hgv?: string;
  bus?: string;
  taxi?: string;
  bicycle?: string;
  emergency?: string;

  emission_class?: string; // "euro1"..."euro6"
  emission_class_hgv?: string;
  emission_class_bus?: string;
  emission?: string; // "CO2", "NOx"

  maxspeed?: string; // "30"
  enforcement?: string; // "yes", "automatic"
  traffic_sign?: string; // "ES:R-505"
  start_date?: string;
  end_date?: string;

  restrictions?: string;
}

export interface VehicleType {
  id: string;
  label: string;
  tags: string[];
  description: string;
}

export const VEHICLE_TYPES: VehicleType[] = [
  {
    id: "zero",
    label: "Zero Emission Vehicle",
    tags: ["0", "eco"],
    description: "Full electric or plug-in hybrids",
  },
  {
    id: "eco",
    label: "ECO Vehicle",
    tags: ["eco", "zero", "0"],
    description: "Low-emission hybrids",
  },
  {
    id: "b",
    label: "Label B",
    tags: ["b", "eco", "zero", "0"],
    description: "Recent gasoline vehicles",
  },
  {
    id: "c",
    label: "Label C",
    tags: ["c", "b", "eco", "zero", "0"],
    description: "Recent diesel and gasoline vehicles",
  },
  {
    id: "noLabel",
    label: "No environmental label",
    tags: [],
    description: "Vehicles without classification",
  },
];

export interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  instructions?: RouteInstruction[];
  waypoints?: Array<{
    name?: string;
    location: [number, number];
  }>;
}

export interface RouteInstruction {
  text: string;
  distance: number;
  duration: number;
  type?: string;
  modifier?: string;
}

export interface WeatherData {
  location?: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  alerts?: string[];
}

export interface LayerVisibility {
  gasStations: boolean;
  evStations: boolean;
  lowEmissionZones: boolean;
  restrictedZones: boolean;
  route: boolean;
}

export interface SearchLocation {
  coords: [number, number];
  name: string;
}
