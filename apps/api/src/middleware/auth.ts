import { Request, Response, NextFunction } from "express";

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-api-key"] || req.query["api_key"];

    // In a real app, this would be validated against a DB or environment variable
    const VALID_API_KEY = process.env.API_KEY || "gis_master_key_2026";

    if (!apiKey || apiKey !== VALID_API_KEY) {
        return res.status(401).json({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "A valid API Key is required to access this resource."
            }
        });
    }

    next();
};
