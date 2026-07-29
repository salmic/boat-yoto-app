const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export function getApiBaseUrl() {
  return apiBaseUrl.replace(/\/$/, "");
}

export async function fetchShipPreview({ lat, lng, city, region, country } = {}) {
  const url = new URL(`${getApiBaseUrl()}/api/preview`);
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

  return response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${getApiBaseUrl()}/health`);
  if (!response.ok) {
    throw new Error("API health check failed");
  }
  return response.json();
}
