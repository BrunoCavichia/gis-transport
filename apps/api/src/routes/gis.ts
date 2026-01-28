import { Router } from "express";
import { repository } from "@gis/database";
import { IGisResponse, GisDashboardData } from "@gis/shared";

const router = Router();

router.get("/snapshot", async (req, res) => {
    try {
        const snapshot = await repository.getLatestSnapshot();

        if (!snapshot) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "No GIS snapshot found."
                }
            } as IGisResponse<never>);
        }

        res.json({
            success: true,
            data: snapshot
        } as IGisResponse<GisDashboardData>);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "Failed to retrieve GIS data.",
                details: String(error)
            }
        } as IGisResponse<never>);
    }
});

export default router;
