import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MapPin,
  Package,
  Store,
  Snowflake,
  Wind,
  CloudFog,
  Circle,
  Droplets,
  Truck,
  Fuel,
  Zap,
} from "lucide-react";
import { THEME } from "./theme";

/**
 * Icon Cache to ensure stable references and prevent unnecessary re-renders
 */
const iconCache: Record<string, L.DivIcon> = {};

/**
 * Needle & Glass map icon factory
 */
const createMapIcon = (
  IconComponent: any,
  color: string,
  size = 14,
  iconSize = 8,
  options: {
    isEnd?: boolean;
    isRounded?: boolean;
    rotate?: number;
    extraHtml?: string;
    opacity?: number;
  } = {},
) => {
  // Generate a unique cache key
  const iconName = IconComponent.displayName || IconComponent.name || "icon";
  const cacheKey = `${iconName}-${color}-${size}-${iconSize}-${JSON.stringify(options)}`;

  if (iconCache[cacheKey]) {
    return iconCache[cacheKey];
  }

  const baseColor = color.startsWith("#") ? color.slice(0, 7) : color;
  const isSolid = options.opacity === 1;
  const alphaValue =
    options.opacity !== undefined
      ? Math.floor(options.opacity * 255)
        .toString(16)
        .padStart(2, "0")
      : "e6";

  const html = renderToStaticMarkup(
    <div
      className="needle-content"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: `${size}px`,
        height: `${size + 12}px`,
        position: "relative",
      }}
    >
      <div
        style={{
          backgroundColor: `${baseColor}${alphaValue}`,
          backdropFilter: isSolid ? "none" : "blur(4px)",
          WebkitBackdropFilter: isSolid ? "none" : "blur(4px)",
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: options.isRounded ? "8px" : "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid white",
          boxShadow: isSolid
            ? "0 4px 12px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.8)"
            : `0 4px 12px rgba(0,0,0,0.2), 0 0 8px ${baseColor}88`,
          transform: options.rotate
            ? `rotate(${options.rotate}deg)`
            : undefined,
          zIndex: 2,
        }}
      >
        <div
          style={{
            transform: options.rotate
              ? `rotate(${-options.rotate}deg)`
              : undefined,
            display: "flex",
          }}
        >
          <IconComponent
            size={iconSize}
            color="white"
            fill={options.isEnd ? "white" : "none"}
            strokeWidth={2.5}
          />
        </div>
      </div>

      <div
        style={{
          width: "2px",
          height: "10px",
          background: `linear-gradient(to bottom, ${baseColor}, transparent)`,
          marginTop: "-1px",
        }}
      />

      <div
        style={{
          width: "6px",
          height: "6px",
          backgroundColor: baseColor,
          borderRadius: "50%",
          marginTop: "-2px",
          boxShadow: `0 0 6px ${baseColor}`,
        }}
      />

      {options.extraHtml && (
        <div dangerouslySetInnerHTML={{ __html: options.extraHtml }} />
      )}
      <style>{`
        .needle-content {
          animation: fade-in 0.4s ease-out forwards;
        }
        .custom-marker-needle.exiting .needle-content {
          animation: fade-out 0.3s ease-in forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.8) translateY(5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.8) translateY(5px); }
        }
      `}</style>
    </div>,
  );

  const icon = L.divIcon({
    html,
    className: "custom-marker-needle",
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
  });

  iconCache[cacheKey] = icon;
  return icon;
};

/**
 * All map icons (POIs, routing, vehicles, weather)
 */
function createMapIcons() {
  return {
    // Routing
    start: createMapIcon(Circle, THEME.colors.info, 28, 16, {
      isEnd: true,
      opacity: 1,
    }),
    end: createMapIcon(MapPin, THEME.colors.danger, 28, 16, {
      opacity: 1,
    }),

    // Vehicles
    vehicle: (color: string) =>
      createMapIcon(Truck, color, 30, 20, { opacity: 1 }),

    // Jobs / POIs
    job: createMapIcon(Package, THEME.colors.accent, 26, 15, {
      opacity: 1,
    }),
    jobWithColor: (color: string) =>
      createMapIcon(Package, color, 26, 15, { opacity: 1 }),
    customPOI: createMapIcon(Store, THEME.colors.customPOI, 28, 16, {
      isRounded: true,
      rotate: 45,
    }),
    gasStation: createMapIcon(Fuel, "#f97316", 26, 14, { opacity: 1 }),
    evStation: createMapIcon(Zap, "#22c55e", 26, 14, { opacity: 1 }),

    // Weather
    weather: {
      snow: createMapIcon(Snowflake, "#3b82f6", 20, 12),
      rain: createMapIcon(Droplets, "#0ea5e9", 20, 12),
      ice: createMapIcon(Droplets, "#0f172a", 20, 12),
      wind: createMapIcon(Wind, "#facc15", 20, 12),
      fog: createMapIcon(CloudFog, "#64748b", 20, 12),
    },

    // Picking / pulse
    picking: L.divIcon({
      className: "",
      html: renderToStaticMarkup(
        <div
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              border: "2px solid #ef4444",
              borderRadius: "50%",
              animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
          <div
            style={{
              backgroundColor: "#ef4444",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
              boxShadow: "0 0 8px rgba(239,68,68,0.6)",
              zIndex: 1,
            }}
          >
            <MapPin size={14} color="white" />
          </div>
          <style>{`
          @keyframes ping {
            75%,100% { transform: scale(2); opacity: 0; }
          }
        `}</style>
        </div>,
      ),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
  };
}


export { createMapIcons, createMapIcon };
