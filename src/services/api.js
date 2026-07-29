function normalizeBaseUrl(url) {
  return url.replace(/\/$/, "");
}

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL
    ? normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
    : null;

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;

    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return origin;
    }

    return envUrl;
  }

  return envUrl || "http://localhost:3001";
}

async function parseJsonResponse(response, label) {
  const text = await response.text();

  if (text.trimStart().startsWith("<!")) {
    throw new Error(
      `${label} returned HTML instead of JSON. Check that the backend URL is correct and you are logged in.`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export async function fetchShipPreview({ lat, lng, city, region, country } = {}) {
  const url = new URL("/api/preview", getApiBaseUrl());
  if (lat && lng) {
    url.searchParams.set("lat", lat);
    url.searchParams.set("lng", lng);
  }
  if (city) url.searchParams.set("city", city);
  if (region) url.searchParams.set("region", region);
  if (country) url.searchParams.set("country", country);

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Preview failed: ${response.status} ${errorText}`);
  }

  return parseJsonResponse(response, "Preview API");
}

export async function fetchHealth() {
  const response = await fetch(`${getApiBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error("API health check failed");
  }
  return parseJsonResponse(response, "Health API");
}
