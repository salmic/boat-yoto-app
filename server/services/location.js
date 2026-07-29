import { config } from "../config.js";

function buildIpapiUrl(ip) {
  const url = new URL(`https://ipapi.co/${ip}/json/`);
  if (config.ipapiKey) {
    url.searchParams.set("key", config.ipapiKey);
  }
  return url.toString();
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

export async function resolveLocationFromIp(ip) {
  if (ip === "127.0.0.1" || ip === "::1") {
    return {
      ip,
      latitude: 51.5074,
      longitude: -0.1278,
      city: "London",
      region: "England",
      country_name: "United Kingdom",
      timezone: "Europe/London",
      isFallback: true,
    };
  }

  const response = await fetch(buildIpapiUrl(ip));
  if (!response.ok) {
    throw new Error(`Location lookup failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.reason || "Location lookup failed");
  }

  return {
    ip,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    city: data.city,
    region: data.region,
    country_name: data.country_name,
    timezone: data.timezone,
    isFallback: false,
  };
}

export function getSessionKey(location) {
  const lat = location.latitude.toFixed(2);
  const lng = location.longitude.toFixed(2);
  const hour = new Date().toISOString().slice(0, 13);
  return `${lat}:${lng}:${hour}`;
}
