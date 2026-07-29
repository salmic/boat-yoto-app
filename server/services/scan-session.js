import { config } from "../config.js";
import {
  resolveLocationFromIp,
  getClientIp,
} from "./location.js";
import { scanNearbyShips, getScanSource } from "./vessels.js";
import { buildScanPreview } from "./narration.js";

const sessions = new Map();

function pruneSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.createdAt > config.sessionTtlMs) {
      sessions.delete(key);
    }
  }
}

function getPlaySessionKey(ip, location) {
  const lat = location.latitude.toFixed(2);
  const lng = location.longitude.toFixed(2);
  return `${ip}:${lat}:${lng}`;
}

async function resolveSessionLocation(req, overrides = {}) {
  if (overrides.latitude && overrides.longitude) {
    return {
      latitude: Number(overrides.latitude),
      longitude: Number(overrides.longitude),
      city: overrides.city || null,
      region: overrides.region || null,
      country_name: overrides.country_name || null,
      timezone: overrides.timezone || null,
      ip: getClientIp(req),
      isFallback: false,
    };
  }

  return resolveLocationFromIp(getClientIp(req));
}

async function createPlaySession(req, overrides = {}) {
  const location = await resolveSessionLocation(req, overrides);
  const ip = getClientIp(req);
  const sessionKey = getPlaySessionKey(ip, location);
  const ships = await scanNearbyShips(location);
  const preview = {
    ...buildScanPreview(location, ships),
    scanSource: getScanSource(ships),
    locationIsFallback: Boolean(location.isFallback),
  };

  const session = {
    sessionKey,
    createdAt: Date.now(),
    location,
    ships,
    preview,
  };

  sessions.set(sessionKey, session);
  return session;
}

export async function startNewPlaySession(req, overrides = {}) {
  pruneSessions();
  return createPlaySession(req, overrides);
}

export async function getActivePlaySession(req, overrides = {}) {
  pruneSessions();

  const location = await resolveSessionLocation(req, overrides);
  const sessionKey = getPlaySessionKey(getClientIp(req), location);
  const existing = sessions.get(sessionKey);

  if (existing) {
    return existing;
  }

  return createPlaySession(req, overrides);
}

export function getShipFromSession(session, shipIndex) {
  return session.ships[shipIndex - 1] || null;
}
