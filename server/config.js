import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildCorsOrigins() {
  const origins = new Set(
    (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );

  if (process.env.PUBLIC_BASE_URL) {
    origins.add(process.env.PUBLIC_BASE_URL.trim().replace(/\/$/, ""));
  }

  return [...origins];
}

export const config = {
  port: Number(process.env.PORT || 3001),
  vesselApiKey: process.env.VESSEL_API_KEY || "",
  vesselApiBase: "https://api.vesselapi.com",
  ipapiKey: process.env.IPAPI_KEY || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:3001",
  scanRadiusNm: Number(process.env.SCAN_RADIUS_NM || 25),
  shipsPerScan: Number(process.env.SHIPS_PER_SCAN || 3),
  ttsVoice: process.env.TTS_VOICE || "en-US-AnaNeural",
  cacheDir: process.env.CACHE_DIR || path.join(__dirname, "..", ".cache"),
  corsOrigins: buildCorsOrigins(),
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 60 * 60 * 1000),
  shufflePoolSize: Number(process.env.SHUFFLE_POOL_SIZE || 20),
};

export function getScanRadiusMeters() {
  return Math.min(config.scanRadiusNm * 1852, 100000);
}
