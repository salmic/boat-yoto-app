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

function isAllowedCorsOrigin(origin, req) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.replace(/\/$/, "");
  if (config.corsOrigins.includes(normalizedOrigin)) {
    return true;
  }

  const host = req.get("host");
  if (host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  return false;
}

function createApiCors() {
  return (req, res, next) => {
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin, req)) {
          callback(null, true);
          return;
        }

        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      },
    })(req, res, next);
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    publicBaseUrl: config.publicBaseUrl,
    hasVesselApiKey: Boolean(config.vesselApiKey),
  });
});

app.use("/audio", audioRoutes);
app.use("/api/preview", createApiCors(), previewRoutes);

app.use("/audio", (_req, res) => {
  res.status(404).json({ error: "Audio endpoint not found" });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

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

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Boat Scanner API listening on port ${config.port}`);
});
