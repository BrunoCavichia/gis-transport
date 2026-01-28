import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiKeyAuth } from "./middleware/auth";
import gisRoutes from "./routes/gis";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/v1/gis", apiKeyAuth, gisRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`API Server running at http://localhost:${port}`);
    console.log(`Version: v1`);
});
