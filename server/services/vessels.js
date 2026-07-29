import { config, getScanRadiusMeters } from "../config.js";
import { fallbackShips } from "../data/fallback-ships.js";

function vesselApiHeaders() {
  if (!config.vesselApiKey) {
    throw new Error("VESSEL_API_KEY is not configured");
  }

  return {
    Authorization: `Bearer ${config.vesselApiKey}`,
    Accept: "application/json",
  };
}

async function vesselApiFetch(pathname, params = {}) {
  const url = new URL(`${config.vesselApiBase}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { headers: vesselApiHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`VesselAPI ${pathname} failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCandidate(vessel) {
  const name = String(vessel.vessel_name || vessel.name || "").trim();
  if (!vessel.mmsi || !name) {
    return false;
  }

  return !/^unknown$/i.test(name);
}

function mapFallbackShip(ship, index, reason = "fallback") {
  return {
    index: index + 1,
    mmsi: ship.mmsi,
    name: ship.name,
    type: ship.type,
    flag: ship.flag,
    length: ship.length,
    yearBuilt: ship.yearBuilt,
    lastPort: ship.lastPort,
    lastPortEvent: ship.lastPortEvent,
    destination: ship.destination,
    etaDays: ship.etaDays,
    funFact: ship.funFact,
    isFallback: true,
    scanReason: reason,
  };
}

export function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getShuffledCandidatePool(candidates) {
  const poolSize = Math.min(config.shufflePoolSize, candidates.length);
  return shuffleArray(candidates.slice(0, poolSize));
}

function getFallbackFleet(reason) {
  return shuffleArray(fallbackShips)
    .slice(0, config.shipsPerScan)
    .map((ship, index) => mapFallbackShip(ship, index, reason));
}

function buildBasicShipFromRadius(vessel, index, location) {
  return {
    index: index + 1,
    mmsi: String(vessel.mmsi),
    name: vessel.vessel_name || vessel.name || "Unknown vessel",
    type: "ship",
    flag: "unknown flag",
    length: null,
    yearBuilt: null,
    lastPort: "an unknown port",
    lastPortEvent: "visit",
    destination: "her next port",
    etaDays: null,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    distanceKm: haversineKm(
      location.latitude,
      location.longitude,
      vessel.latitude,
      vessel.longitude
    ),
    isFallback: false,
    scanReason: "live",
  };
}

export function mergeVesselEnrichment(basicShip, { details, eta, lastPortEvent } = {}) {
  const ship = { ...basicShip };

  if (details?.vessel) {
    const vessel = details.vessel;
    ship.name = vessel.name || vessel.name_ais || ship.name;
    ship.type = vessel.vessel_type || vessel.vessel_subtype || ship.type;
    ship.flag = vessel.country || ship.flag;
    ship.length = vessel.length ?? ship.length;
    ship.yearBuilt = vessel.year_built ?? ship.yearBuilt;
  }

  if (eta?.vesselEta) {
    const vesselEta = eta.vesselEta;
    ship.destination =
      vesselEta.destination ||
      vesselEta.destination_port ||
      ship.destination;
    if (vesselEta.eta) {
      const etaDate = new Date(vesselEta.eta);
      if (!Number.isNaN(etaDate.getTime())) {
        ship.etaDays = Math.max(
          1,
          Math.round((etaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );
      }
    }
  }

  if (lastPortEvent?.portEvent) {
    const portEvent = lastPortEvent.portEvent;
    ship.lastPort = portEvent.port?.name || ship.lastPort;
    ship.lastPortEvent = portEvent.event || ship.lastPortEvent;
  }

  return ship;
}

async function enrichVessel(basicShip) {
  const mmsi = basicShip.mmsi;
  const [details, eta, lastPortEvent] = await Promise.allSettled([
    vesselApiFetch(`/v1/vessel/${mmsi}`, { "filter.idType": "mmsi" }),
    vesselApiFetch(`/v1/vessel/${mmsi}/eta`, { "filter.idType": "mmsi" }),
    vesselApiFetch(`/v1/portevents/vessel/${mmsi}/last`, {
      "filter.idType": "mmsi",
    }),
  ]);

  return mergeVesselEnrichment(basicShip, {
    details: details.status === "fulfilled" ? details.value : null,
    eta: eta.status === "fulfilled" ? eta.value : null,
    lastPortEvent:
      lastPortEvent.status === "fulfilled" ? lastPortEvent.value : null,
  });
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((vessel) => {
    if (seen.has(vessel.mmsi)) {
      return false;
    }
    seen.add(vessel.mmsi);
    return true;
  });
}

function rankCandidates(vessels, location) {
  return dedupeCandidates(
    vessels
      .filter(isValidCandidate)
      .map((vessel) => ({
        ...vessel,
        distanceKm: haversineKm(
          location.latitude,
          location.longitude,
          vessel.latitude,
          vessel.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
  );
}

export function getScanSource(ships) {
  if (ships.length === 0) {
    return "fallback";
  }

  const liveCount = ships.filter((ship) => !ship.isFallback).length;
  if (liveCount === ships.length) {
    return "live";
  }
  if (liveCount > 0) {
    return "mixed";
  }
  return "fallback";
}

export async function scanNearbyShips(location) {
  if (!config.vesselApiKey) {
    console.warn("VESSEL_API_KEY not set, using fallback ships");
    return getFallbackFleet("no-api-key");
  }

  try {
    const radiusResult = await vesselApiFetch("/v1/location/vessels/radius", {
      "filter.latitude": location.latitude,
      "filter.longitude": location.longitude,
      "filter.radius": getScanRadiusMeters(),
      "pagination.limit": 50,
    });

    const candidates = getShuffledCandidatePool(
      rankCandidates(radiusResult.vessels || [], location)
    );

    if (candidates.length === 0) {
      console.warn(
        `No vessels found within ${config.scanRadiusNm}nm of ${location.latitude},${location.longitude}`
      );
      return getFallbackFleet("no-nearby-vessels");
    }

    const enriched = [];

    for (const vessel of candidates) {
      if (enriched.length >= config.shipsPerScan) {
        break;
      }

      const basicShip = buildBasicShipFromRadius(vessel, enriched.length, location);

      try {
        enriched.push(await enrichVessel(basicShip));
      } catch (error) {
        console.warn(
          `Enrichment failed for ${vessel.mmsi}, using basic AIS data:`,
          error.message
        );
        enriched.push(basicShip);
      }
    }

    if (enriched.length === 0) {
      return getFallbackFleet("enrichment-failed");
    }

    while (
      enriched.length < config.shipsPerScan &&
      enriched.length < candidates.length
    ) {
      const vessel = candidates[enriched.length];
      const basicShip = buildBasicShipFromRadius(vessel, enriched.length, location);
      try {
        enriched.push(await enrichVessel(basicShip));
      } catch {
        enriched.push(basicShip);
      }
    }

    if (enriched.length < config.shipsPerScan) {
      const needed = config.shipsPerScan - enriched.length;
      const extras = getFallbackFleet("insufficient-nearby-vessels").slice(
        0,
        needed
      );
      enriched.push(...extras);
    }

    return enriched
      .slice(0, config.shipsPerScan)
      .map((ship, index) => ({ ...ship, index: index + 1 }));
  } catch (error) {
    console.warn("Vessel scan failed, using fallback ships:", error.message);
    return getFallbackFleet("api-error");
  }
}
