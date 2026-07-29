import { config } from "../config.js";
import {
  resolveLocationFromIp,
  getSessionKey,
  getClientIp,
} from "./location.js";
import { scanNearbyShips } from "./vessels.js";
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

export async function getScanSession(req, overrides = {}) {
  pruneSessions();

  const location =
    overrides.latitude && overrides.longitude
      ? {
          latitude: Number(overrides.latitude),
          longitude: Number(overrides.longitude),
          city: overrides.city || null,
          region: overrides.region || null,
          country_name: overrides.country_name || null,
          timezone: overrides.timezone || null,
          ip: getClientIp(req),
          isFallback: false,
        }
      : await resolveLocationFromIp(getClientIp(req));

  const sessionKey = getSessionKey(location);
  const existing = sessions.get(sessionKey);
  if (existing) {
    return existing;
  }

  const ships = await scanNearbyShips(location);
  const preview = buildScanPreview(location, ships);
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

export function getShipFromSession(session, shipIndex) {
  return session.ships[shipIndex - 1] || null;
}
