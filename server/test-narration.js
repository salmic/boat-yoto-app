import { buildShipScript, buildIntroScript, buildOutroScript } from "./services/narration.js";

const ship = {
  name: "Maersk Roubaix",
  type: "Container Ship",
  flag: "Hong Kong",
  lastPort: "Singapore",
  lastPortEvent: "departure",
  destination: "Rotterdam",
  etaDays: 18,
  length: 294,
  yearBuilt: 2006,
};

const script = buildShipScript({ ...ship, index: 1 });

if (/ahoy/i.test(script)) {
  throw new Error("Ship script should not use Ahoy");
}

if (!script.includes("Maersk Roubaix")) {
  throw new Error("Ship script missing vessel name");
}

if (!script.includes("Singapore")) {
  throw new Error("Ship script missing last port");
}

if (!script.includes("Rotterdam")) {
  throw new Error("Ship script missing destination");
}

if (!script.includes("Fun fact:")) {
  throw new Error("Ship script missing fun fact");
}

const intro = buildIntroScript({ city: "Seattle", region: "Washington" });
if (!intro.includes("Seattle")) {
  throw new Error("Intro script missing location");
}

if (/ahoy/i.test(intro)) {
  throw new Error("Intro script should not use Ahoy");
}

const outro = buildOutroScript();
if (!outro.includes("scan")) {
  throw new Error("Outro script missing closing phrase");
}

console.log("Narration tests passed");
