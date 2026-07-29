export const storageKey = "YOTO_USER_LOCATION";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const apiKey = import.meta.env.VITE_IPAPI_KEY;

function buildApiUrl() {
  const url = new URL("https://ipapi.co/json/");
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }
  return url.toString();
}

function readCache() {
  const cached = localStorage.getItem(storageKey);
  if (!cached) {
    return null;
  }

  try {
    const { location, fetchedAt } = JSON.parse(cached);
    if (!location || Date.now() - fetchedAt > CACHE_TTL_MS) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return location;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

function writeCache(location) {
  localStorage.setItem(
    storageKey,
    JSON.stringify({ location, fetchedAt: Date.now() })
  );
}

export async function fetchUserLocation() {
  const cached = readCache();
  if (cached) {
    return cached;
  }

  const response = await fetch(buildApiUrl());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Location lookup failed: ${response.status} ${errorText}`);
  }

  const location = await response.json();

  if (location.error) {
    throw new Error(location.reason || "Location lookup failed");
  }

  writeCache(location);
  return location;
}

export function getTimeOfDayGreeting(timezone) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function formatLocationLabel(location) {
  if (!location) {
    return null;
  }

  const parts = [location.city, location.region, location.country_name].filter(Boolean);
  return parts.join(", ");
}
