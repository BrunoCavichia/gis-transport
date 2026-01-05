export const createWeatherIcons = () => {
  const L = require("leaflet");

  return {
    gasStationIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #f97316; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 22V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/>
          <path d="M16 8h2a2 2 0 0 1 2 2v6.5a2.5 2.5 0 0 0 5 0V10"/>
          <path d="M6 8h6"/>
          <path d="M6 12h6"/>
          <path d="M6 16h6"/>
        </svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),

    evStationIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),

    startIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),

    endIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #ef4444; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),

    createVehicleIcon: (color: string) =>
      L.divIcon({
        className: "custom-vehicle-icon",
        html: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8h13v8H3z" fill="${color}" stroke="white" stroke-width="1.2"/>
        <path d="M16 10h3l2 3v3h-5v-6z" fill="${color}" stroke="white" stroke-width="1.2"/>
        <rect x="4" y="9" width="3" height="2.5" fill="white" opacity="0.8"/>
        <rect x="8" y="9" width="3" height="2.5" fill="white" opacity="0.8"/>
        <rect x="12" y="9" width="3" height="2.5" fill="white" opacity="0.8"/>
        <path d="M17 11h2.5l1.5 1.5v1.5h-4v-3z" fill="white" opacity="0.8"/>
        <circle cx="7" cy="17" r="1.8" fill="#2d3748" stroke="white" stroke-width="1"/>
        <circle cx="7" cy="17" r="1" fill="#4a5568"/>
        <circle cx="17" cy="17" r="1.8" fill="#2d3748" stroke="white" stroke-width="1"/>
        <circle cx="17" cy="17" r="1" fill="#4a5568"/>
        <rect x="4.5" y="13" width="1" height="2" fill="white" opacity="0.6"/>
        <rect x="6" y="13" width="1" height="2" fill="white" opacity="0.6"/>
      </svg>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),

    snowIcon: L.divIcon({
      className: "weather-marker",
      html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; display:flex; align-items:center; justify-content:center; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),

    rainIcon: L.divIcon({
      className: "weather-marker",
      html: `<div style="background-color: #0ea5e9; width: 20px; height: 20px; border-radius: 50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13l-4 4-4-4M12 3v10"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),

    iceIcon: L.divIcon({
      className: "weather-marker",
      html: `<div style="background-color: #0f172a; width: 20px; height: 20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),

    windIcon: L.divIcon({
      className: "weather-marker",
      html: `<div style="background-color: #facc15; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h12M3 18h12"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),

    fogIcon: L.divIcon({
      className: "weather-marker",
      html: `<div style="background-color: #64748b; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 16h18M3 8h12"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),

    jobIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #8b5cf6; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16.5 9.4 7.5 4.21"/>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.29 7 12 12 20.71 7"/>
          <line x1="12" y1="22" x2="12" y2="12"/>
        </svg>
      </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),

    customPOIIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: #06b6d4; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(45deg);">
        <div style="transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"/>
            <path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/>
            <path d="M5 21V10.85"/>
            <path d="M19 21V10.85"/>
            <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
          </svg>
        </div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    }),

    pickingIcon: L.divIcon({
      className: "custom-marker picking-marker",
      html: `<div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border: 2px solid #ef4444; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); z-index: 1;"></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      </style>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }),

    alertOctagonIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-image: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 26px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),

    alertTriangleIcon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-image: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 26px; height: 26px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3); clip-path: polygon(50% 0%, 0% 100%, 100% 100%);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 4px;">
          <path d="m12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
      </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),

    suggestedStationIcon: L.divIcon({
      className: "custom-marker suggestion-marker",
      html: `<div style="background-color: #facc15; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ef4444; box-shadow: 0 0 10px rgba(234, 179, 8, 0.5); animation: pulse-yellow 2s infinite;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
      </div>
      <style>
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
          100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
        }
      </style>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
  };
};
