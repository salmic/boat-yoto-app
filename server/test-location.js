import {
  isPrivateOrLocalIp,
  resolveLocationFromIp,
} from "./services/location.js";

if (!isPrivateOrLocalIp("192.168.1.4")) {
  throw new Error("Expected 192.168.1.4 to be private");
}

if (!isPrivateOrLocalIp("127.0.0.1")) {
  throw new Error("Expected localhost to be private");
}

if (isPrivateOrLocalIp("8.8.8.8")) {
  throw new Error("Expected 8.8.8.8 to be public");
}

const fallback = await resolveLocationFromIp("127.0.0.1");
if (!fallback.isFallback || !fallback.city) {
  throw new Error("Expected fallback location for localhost");
}

console.log("Location tests passed");
