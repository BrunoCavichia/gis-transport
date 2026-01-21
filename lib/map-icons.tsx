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
} from "lucide-react";
import { THEME } from "./theme";

/**
 * Boutique "Needle & Glass" map icon helper.
 * Features a glassmorphic bubble floating over a precision needle anchor.
 */
const createMapIcon = (
  IconComponent: any,
  color: string,
  size = 32,
  iconSize = 14,
  options: {
    isEnd?: boolean;
    isRounded?: boolean;
    rotate?: number;
    extraHtml?: string;
    opacity?: number;
  } = {}
) => {
  // Ensure we have a clean 6-digit hex before appending alpha
  const baseColor = color.startsWith('#') ? color.slice(0, 7) : color;
  const isSolid = options.opacity === 1;
  const alphaValue = options.opacity !== undefined
    ? Math.floor(options.opacity * 255).toString(16).padStart(2, '0')
    : 'e6';

  const html = renderToStaticMarkup(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: `${size}px`,
      height: `${size + 12}px`,
      position: 'relative',
    }}>
      {/* Glass Bubble / Solid Bubble */}
      <div style={{
        backgroundColor: `${baseColor}${alphaValue}`,
        backdropFilter: isSolid ? 'none' : 'blur(4px)',
        WebkitBackdropFilter: isSolid ? 'none' : 'blur(4px)',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: options.isRounded ? '8px' : '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid white',
        boxShadow: isSolid
          ? `0 4px 10px rgba(0, 0, 0, 0.4)`
          : `0 4px 12px rgba(0, 0, 0, 0.2), 0 0 8px ${baseColor}88`,
        transform: options.rotate ? `rotate(${options.rotate}deg)` : undefined,
        zIndex: 2,
      }}>
        <div style={{ transform: options.rotate ? `rotate(${-options.rotate}deg)` : undefined, display: 'flex' }}>
          <IconComponent size={iconSize} color="white" fill={options.isEnd ? "white" : "none"} strokeWidth={2.5} />
        </div>
      </div>

      {/* Needle Stem */}
      <div style={{
        width: '2px', // Slightly thicker stem
        height: '10px',
        background: `linear-gradient(to bottom, ${baseColor}, transparent)`,
        marginTop: '-1px',
        zIndex: 1,
      }} />

      {/* Ground Spot / Anchor */}
      <div style={{
        width: '6px', // Larger anchor
        height: '6px',
        backgroundColor: baseColor,
        borderRadius: '50%',
        marginTop: '-2px',
        boxShadow: `0 0 6px ${baseColor}`,
      }} />

      {options.extraHtml && <div dangerouslySetInnerHTML={{ __html: options.extraHtml }} />}
    </div>
  );

  return L.divIcon({
    html,
    className: 'custom-marker-needle',
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 10],
  });
};

/**
 * Minimalist "Dot" map icon helper.
 * Used for lower zoom levels to reduce clutter.
 */
const createMinimalIcon = (color: string) => {
  const html = renderToStaticMarkup(
    <div style={{
      width: '8px',
      height: '8px',
      backgroundColor: color,
      borderRadius: '50%',
      border: '1.5px solid white',
      boxShadow: `0 0 6px ${color}aa`,
    }} />
  );

  return L.divIcon({
    html,
    className: 'custom-marker-minimal',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
};

export const createWeatherIcons = () => {
  return {
    gasStationIcon: createMapIcon(Fuel, '#f97316'),
    gasStationIconMinimal: createMinimalIcon('#f97316'),

    evStationIcon: createMapIcon(Zap, '#22c55e'),
    evStationIconMinimal: createMinimalIcon('#22c55e'),

    startIcon: createMapIcon(Circle, THEME.colors.info, 28, 16, { isEnd: true, opacity: 1 }),

    endIcon: createMapIcon(MapPin, THEME.colors.danger, 28, 16, { opacity: 1 }),

    createVehicleIcon: (color: string) => createMapIcon(Truck, color, 30, 20, { opacity: 1 }),
    createMinimalIcon: (color: string) => createMinimalIcon(color),

    snowIcon: createMapIcon(Snowflake, '#3b82f6', 20, 12),
    rainIcon: createMapIcon(Droplets, '#0ea5e9', 20, 12),
    iceIcon: createMapIcon(Droplets, '#0f172a', 20, 12), // Ice can use droplets or Snowflake
    windIcon: createMapIcon(Wind, '#facc15', 20, 12),
    fogIcon: createMapIcon(CloudFog, '#64748b', 20, 12),

    jobIcon: createMapIcon(Package, THEME.colors.accent, 26, 15, { opacity: 1 }),

    customPOIIcon: createMapIcon(Store, THEME.colors.customPOI, 28, 16, { isRounded: true, rotate: 45 }),

    pickingIcon: L.divIcon({
      className: "",
      html: renderToStaticMarkup(
        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '2px solid #ef4444',
            borderRadius: '50%',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
          <div style={{
            backgroundColor: '#ef4444',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            zIndex: 1
          }}>
            <MapPin size={14} color="white" />
          </div>
          <style>{`
            @keyframes ping {
              75%, 100% { transform: scale(2); opacity: 0; }
            }
          `}</style>
        </div>
      ),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),
  };
};
