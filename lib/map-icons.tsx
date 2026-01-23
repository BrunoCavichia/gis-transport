import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Fuel,
  Zap,
  MapPin,
  Package,
  Store,
  Snowflake,
  Wind,
  CloudFog,
  Circle,
  Droplets,
  Truck,
  Car,
} from "lucide-react";
import { THEME } from "./theme";

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
  } = {}
) => {
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
            ? "0 4px 10px rgba(0,0,0,0.4)"
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
    </div>
  );

  return L.divIcon({
    html,
    className: "custom-marker-needle",
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
  });
};

/**
 * All map icons (POIs, routing, vehicles, weather)
 */
function createMapIcons() {
  return {
    // Stations
    gasStation: createMapIcon(Fuel, "#f97316"),
    evStation: createMapIcon(Zap, "#22c55e"),

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
    customPOI: createMapIcon(Store, THEME.colors.customPOI, 28, 16, {
      isRounded: true,
      rotate: 45,
    }),

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
              animation:
                "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
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
        </div>
      ),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
  };

}



export const createRouteLabelIcon = (
  distance: string,
  duration: string,
  color: string
) => {
  const html = renderToStaticMarkup(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
      }}
    >
      <div
        className="bg-white border-black border px-1.5 py-0.5 shadow-[2px_2px_0_rgba(0,0,0,0.08)] flex items-center gap-1.5"
        style={{ minWidth: "50px", whiteSpace: "nowrap" }}
      >
        <div style={{ color }}>
          <Car className="w-4 h-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[10px] font-extrabold tracking-tighter"
            style={{ color: "#f59e0b" }}
          >
            {duration}
          </span>
          <span className="text-[8px] font-bold text-zinc-500">
            {distance}
          </span>
        </div>
      </div>

      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid black",
          marginTop: "-1px",
        }}
      />
    </div>
  );

  return L.divIcon({
    html,
    className: "bg-transparent",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export { createMapIcons };