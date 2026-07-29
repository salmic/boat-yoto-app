import { config, getScanRadiusMeters } from "../config.js";
import { fallbackShips } from "../data/fallback-ships.js";

const INTERESTING_TYPES = new Set([
  "cargo",
  "tanker",
  "passenger",
  "fishing",
  "tug",
  "container",
  "bulk",
  "research",
  "ferry",
  "yacht",
  "sailing",
]);

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

function normalizeType(type) {
  return String(type || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function isInterestingVessel(vessel) {
  const type = normalizeType(vessel.type || vessel.vesselType || vessel.shipType);
  if (!type) {
    return true;
  }

  return [...INTERESTING_TYPES].some((candidate) => type.includes(candidate));
}

function mapFallbackShip(ship, index) {
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
  };
}

async function enrichVessel(vessel, index) {
  const mmsi = String(vessel.mmsi);
  const [details, eta, lastPortEvent] = await Promise.allSettled([
    vesselApiFetch(`/v1/vessel/${mmsi}`, { "filter.idType": "mmsi" }),
    vesselApiFetch(`/v1/vessel/${mmsi}/eta`, { "filter.idType": "mmsi" }),
    vesselApiFetch(`/v1/portevents/vessel/${mmsi}/last`, {
      "filter.idType": "mmsi",
    }),
  ]);

  const detailData = details.status === "fulfilled" ? details.value : {};
  const etaData = eta.status === "fulfilled" ? eta.value : {};
  const portData =
    lastPortEvent.status === "fulfilled" ? lastPortEvent.value : {};

  const vesselInfo = detailData.vessel || detailData || {};
  const etaInfo = etaData.eta || etaData || {};
  const portInfo = portData.portEvent || portData.event || portData || {};

  const destination =
    etaInfo.destination ||
    etaInfo.destinationPort ||
    vessel.destination ||
    "an unknown port";

  let etaDays = null;
  if (etaInfo.eta || etaInfo.estimatedTimeOfArrival) {
    const etaDate = new Date(etaInfo.eta || etaInfo.estimatedTimeOfArrival);
    if (!Number.isNaN(etaDate.getTime())) {
      etaDays = Math.max(
        1,
        Math.round((etaDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    }
  }

  return {
    index: index + 1,
    mmsi,
    name:
      vesselInfo.name ||
      vessel.vessel_name ||
      vessel.name ||
      "Unknown vessel",
    type:
      vesselInfo.type ||
      vesselInfo.vesselType ||
      vesselInfo.shipType ||
      "ship",
    flag: vesselInfo.flag || vesselInfo.country || "unknown flag",
    length: vesselInfo.length || vesselInfo.dimensions?.length || null,
    yearBuilt: vesselInfo.yearBuilt || vesselInfo.builtYear || null,
    lastPort:
      portInfo.portName ||
      portInfo.port?.name ||
      portInfo.port ||
      "an unknown port",
    lastPortEvent: portInfo.eventType || portInfo.type || "visit",
    destination,
    etaDays,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    isFallback: false,
  };
}

export async function scanNearbyShips(location) {
  if (!config.vesselApiKey) {
    return fallbackShips
      .slice(0, config.shipsPerScan)
      .map(mapFallbackShip);
  }

  try {
    const radiusResult = await vesselApiFetch("/v1/location/vessels/radius", {
      "filter.latitude": location.latitude,
      "filter.longitude": location.longitude,
      "filter.radius": getScanRadiusMeters(),
      "pagination.limit": Math.max(config.shipsPerScan * 3, 10),
    });

    const candidates = (radiusResult.vessels || [])
      .filter((vessel) => vessel.mmsi && vessel.vessel_name)
      .slice(0, config.shipsPerScan * 2);

    if (candidates.length === 0) {
      return fallbackShips
        .slice(0, config.shipsPerScan)
        .map(mapFallbackShip);
    }

    const enriched = [];
    for (const [index, vessel] of candidates.entries()) {
      if (enriched.length >= config.shipsPerScan) {
        break;
      }

      try {
        const ship = await enrichVessel(vessel, enriched.length);
        if (isInterestingVessel(ship)) {
          enriched.push(ship);
        }
      } catch (error) {
        console.warn(`Failed to enrich vessel ${vessel.mmsi}:`, error.message);
      }
    }

    if (enriched.length === 0) {
      return fallbackShips
        .slice(0, config.shipsPerScan)
        .map(mapFallbackShip);
    }

    while (enriched.length < config.shipsPerScan) {
      const fallback = fallbackShips[enriched.length % fallbackShips.length];
      enriched.push(mapFallbackShip(fallback, enriched.length));
    }

    return enriched.slice(0, config.shipsPerScan);
  } catch (error) {
    console.warn("Vessel scan failed, using fallback ships:", error.message);
    return fallbackShips
      .slice(0, config.shipsPerScan)
      .map(mapFallbackShip);
  }
}
