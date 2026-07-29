import { config } from "../config.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 15 * 60 * 1000;

const ipLocationCache = new Map();

const DEFAULT_FALLBACK_LOCATION = {
  latitude: 47.6062,
  longitude: -122.3321,
  city: "Seattle",
  region: "Washington",
  country_name: "United States",
  timezone: "America/Los_Angeles",
  isFallback: true,
};

function buildIpapiUrl(ip) {
  const url = new URL(`https://ipapi.co/${ip}/json/`);
  if (config.ipapiKey) {
    url.searchParams.set("key", config.ipapiKey);
  }
  return url.toString();
}

function readCache(ip) {
  const cached = ipLocationCache.get(ip);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > cached.ttlMs) {
    ipLocationCache.delete(ip);
    return null;
  }

  return cached.location;
}

function writeCache(ip, location, ttlMs = CACHE_TTL_MS) {
  ipLocationCache.set(ip, {
    location,
    fetchedAt: Date.now(),
    ttlMs,
  });
}

export function isPrivateOrLocalIp(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return true;
  }

  if (ip.startsWith("10.")) {
    return true;
  }

  if (ip.startsWith("192.168.")) {
    return true;
  }

  if (ip.startsWith("172.")) {
    const secondOctet = Number(ip.split(".")[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }

  return false;
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress?.replace(/^::ffff:/, "") || "127.0.0.1";
}

function normalizeLocation(ip, data, isFallback = false) {
  return {
    ip,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    city: data.city || null,
    region: data.region || data.regionName || null,
    country_name: data.country_name || data.country || null,
    timezone: data.timezone || null,
    isFallback,
  };
}

async function lookupWithIpapi(ip) {
  const response = await fetch(buildIpapiUrl(ip));
  if (!response.ok) {
    throw new Error(`ipapi.co failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.reason || "ipapi.co lookup failed");
  }

  return normalizeLocation(ip, data, false);
}

async function lookupWithIpApiCom(ip) {
  const url = new URL(`http://ip-api.com/json/${ip}`);
  url.searchParams.set(
    "fields",
    "status,message,lat,lon,city,regionName,country,timezone"
  );

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ip-api.com failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "success") {
    throw new Error(data.message || "ip-api.com lookup failed");
  }

  return normalizeLocation(
    ip,
    {
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      regionName: data.regionName,
      country: data.country,
      timezone: data.timezone,
    },
    false
  );
}

function buildFallbackLocation(ip, reason) {
  console.warn(`Using fallback location for ${ip}: ${reason}`);
  return {
    ...DEFAULT_FALLBACK_LOCATION,
    ip,
    isFallback: true,
  };
}

export async function resolveLocationFromIp(ip) {
  const cached = readCache(ip);
  if (cached) {
    return cached;
  }

  if (isPrivateOrLocalIp(ip)) {
    const fallback = buildFallbackLocation(ip, "private or local IP");
    writeCache(ip, fallback, FAILURE_CACHE_TTL_MS);
    return fallback;
  }

  const providers = [lookupWithIpapi, lookupWithIpApiCom];
  let lastError = null;

  for (const provider of providers) {
    try {
      const location = await provider(ip);
      writeCache(ip, location);
      return location;
    } catch (error) {
      lastError = error;
      console.warn(`Location provider failed for ${ip}:`, error.message);
    }
  }

  const fallback = buildFallbackLocation(
    ip,
    lastError?.message || "all providers failed"
  );
  writeCache(ip, fallback, FAILURE_CACHE_TTL_MS);
  return fallback;
}

export function getSessionKey(location) {
  const lat = location.latitude.toFixed(2);
  const lng = location.longitude.toFixed(2);
  const hour = new Date().toISOString().slice(0, 13);
  return `${lat}:${lng}:${hour}`;
}
