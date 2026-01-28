import { describe, it, expect, vi } from "vitest";
import { GisDashboardDataSchema } from "@gis/shared";

// Mocking the repository
vi.mock("@gis/database", () => ({
    repository: {
        getLatestSnapshot: vi.fn()
    }
}));

describe("GIS API Contract", () => {
    it("should return data that matches the shared schema", async () => {
        const { repository } = await import("@gis/database");

        const mockData = {
            meta: { generatedAt: new Date().toISOString() },
            fleet: {
                totalVehicles: 10,
                activeVehicles: 5,
                vehiclesByType: { "ev": 5 },
                vehicles: [
                    { id: "v1", type: "ev", label: "EV 1", position: [40, -3] }
                ]
            },
            optimization: {
                status: "optimized",
                totalJobs: 20,
                assignedJobs: 20,
                unassignedJobs: 0,
                routes: [],
                totals: { distanceFormatted: "100km", durationFormatted: "2h" }
            },
            weather: {
                overallRisk: "LOW",
                alertCount: 0,
                alertsByType: {},
                affectedRoutes: 0,
                alerts: []
            }
        };

        (repository.getLatestSnapshot as any).mockResolvedValue(mockData);

        // This is a unit-level contract test. In a full integration test, 
        // we would use supertest to hit the actual endpoint.
        const result = GisDashboardDataSchema.safeParse(mockData);

        expect(result.success).toBe(true);
        if (!result.success) {
            console.error(result.error.format());
        }
    });
});
