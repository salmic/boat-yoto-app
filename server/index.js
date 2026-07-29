import "./load-env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import audioRoutes from "./routes/audio.js";
import previewRoutes from "./routes/preview.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    publicBaseUrl: config.publicBaseUrl,
    hasVesselApiKey: Boolean(config.vesselApiKey),
  });
});

app.use("/audio", audioRoutes);
app.use("/api/preview", previewRoutes);

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/audio") || req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) {
      next();
    }
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Boat Scanner API listening on port ${config.port}`);
});
