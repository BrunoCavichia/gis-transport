import { OPENWEATHER_URL } from "@/lib/config";
import { WeatherAlert, RawWeatherData, RouteWeather, VehicleRoute } from "@gis/shared";

export class WeatherService {
    private static cache = new Map<string, { data: RawWeatherData[]; timestamp: number }>();
    private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Samples points along routes and fetches weather alerts.
     */
    static async analyzeRoutes(
        vehicleRoutes: VehicleRoute[],
        startTime: string = new Date().toISOString()
    ): Promise<RouteWeather[]> {
        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        if (!apiKey) {
            console.error("WeatherService: Missing OpenWeatherMap API key");
            return [];
        }

        const startDate = new Date(startTime);
        const results: RouteWeather[] = [];

        for (const vr of vehicleRoutes) {
            const alerts: WeatherAlert[] = [];
            const coords = vr.coordinates || [];

            if (coords.length === 0) {
                results.push({ vehicle: vr.vehicleId, riskLevel: "LOW", alerts: [] });
                continue;
            }

            // Sample indices: start, middle, end
            const samples = Array.from(new Set([0, Math.floor(coords.length / 2), coords.length - 1]));

            for (let i = 0; i < samples.length; i++) {
                const idx = samples[i];
                const point = coords[idx];
                if (!point) continue;

                const [lat, lon] = point;
                const forecast = await this.getForecast(lat, lon, apiKey);

                if (!forecast || forecast.length === 0) continue;

                const frac = coords.length <= 1 ? 0 : idx / (coords.length - 1);
                const eta = new Date(startDate.getTime() + ((vr.duration || 0) * frac * 1000)).getTime() / 1000;

                // Find closest forecast item
                const closest = forecast.reduce((prev: RawWeatherData, curr: RawWeatherData) =>
                    Math.abs(curr.dt - eta) < Math.abs(prev.dt - eta) ? curr : prev
                );

                const pointAlerts = this.evaluateThresholds(closest, lat, lon, new Date(eta * 1000).toISOString(), i);
                alerts.push(...pointAlerts);
            }

            const riskLevel = alerts.some(a => a.severity === "HIGH")
                ? "HIGH"
                : alerts.length > 0 ? "MEDIUM" : "LOW";

            results.push({
                vehicle: vr.vehicleId,
                riskLevel,
                alerts
            });
        }

        return results;
    }

    private static async getForecast(lat: number, lon: number, apiKey: string): Promise<RawWeatherData[]> {
        const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            const res = await fetch(
                `${OPENWEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
            );
            if (!res.ok) return [];
            const data = await res.json();
            const forecast = data.list || [];

            this.cache.set(cacheKey, { data: forecast, timestamp: Date.now() });
            return forecast;
        } catch (e) {
            console.error("WeatherService: Forecast fetch failed", e);
            return [];
        }
    }

    private static evaluateThresholds(
        data: RawWeatherData,
        lat: number,
        lon: number,
        timeWindow: string,
        segmentIndex: number
    ): WeatherAlert[] {
        const alerts: WeatherAlert[] = [];

        const temp = data.main?.temp ?? 0;
        const rain = data.rain?.["3h"] ?? 0;
        const snow = data.snow?.["3h"] ?? 0;
        const wind = data.wind?.speed ?? 0;
        const visibility = data.visibility ?? 10000;

        if (snow > 0) {
            alerts.push({
                segmentIndex,
                event: "SNOW",
                severity: snow >= 5 ? "HIGH" : "MEDIUM",
                message: "Nieve en ruta: reducir velocidad y precaución.",
                lat, lon, timeWindow
            });
        }

        if (rain > 10) {
            alerts.push({
                segmentIndex,
                event: "RAIN",
                severity: rain >= 20 ? "HIGH" : "MEDIUM",
                message: "Lluvia significativa: posible hidroplaneo.",
                lat, lon, timeWindow
            });
        }

        if (temp <= 0 && rain > 0) {
            alerts.push({
                segmentIndex,
                event: "ICE",
                severity: "HIGH",
                message: "Riesgo de hielo: extremar precaución.",
                lat, lon, timeWindow
            });
        }

        if (wind >= 15) {
            alerts.push({
                segmentIndex,
                event: "WIND",
                severity: wind >= 25 ? "HIGH" : "MEDIUM",
                message: `Viento fuerte (${wind.toFixed(1)} m/s): sujetar volante.`,
                lat, lon, timeWindow
            });
        }

        if (visibility < 1000) {
            alerts.push({
                segmentIndex,
                event: "FOG",
                severity: visibility < 200 ? "HIGH" : "MEDIUM",
                message: `Niebla: visibilidad reducida (${visibility} m).`,
                lat, lon, timeWindow
            });
        }

        return alerts;
    }
}
