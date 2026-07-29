const FLAG_FACTS = {
  panama: "Many big ships sail under the flag of Panama because it is a popular country for registering vessels.",
  liberia: "Liberia registers more ships than almost any other country in the world.",
  "united states": "Ships flying the American flag often work along the coasts of the United States.",
  "united kingdom": "British ships have a long history of crossing oceans and exploring the world.",
  netherlands: "The Netherlands is famous for shipbuilding and busy ports like Rotterdam.",
  norway: "Norway is known for strong ships that can handle cold northern seas.",
  "hong kong": "Hong Kong is one of the busiest ports in the world.",
  bermuda: "Bermuda is home to many famous passenger ships and cruise liners.",
};

const TYPE_FACTS = {
  tug: "Tugboats are small but mighty ships that help bigger vessels dock safely.",
  fishing: "Fishing boats bring fresh seafood from the ocean to people on land.",
  tanker: "Tanker ships carry liquids like oil or fuel across the sea.",
  passenger: "Passenger ships carry people on journeys across the water.",
  container: "Container ships carry huge metal boxes filled with goods from all over the world.",
  research: "Research vessels help scientists learn about the ocean.",
  ferry: "Ferries carry cars and people across bays, rivers, and short sea routes.",
};

function formatType(type) {
  const normalized = String(type || "ship").toLowerCase();
  if (normalized.includes("tug")) return "tugboat";
  if (normalized.includes("container")) return "container ship";
  if (normalized.includes("tanker")) return "tanker ship";
  if (normalized.includes("passenger")) return "passenger ship";
  if (normalized.includes("fishing")) return "fishing boat";
  if (normalized.includes("ferry")) return "ferry";
  if (normalized.includes("research")) return "research vessel";
  return normalized.replace(/_/g, " ");
}

function formatEtaDays(days) {
  if (!days) {
    return "soon";
  }
  if (days === 1) {
    return "about one day";
  }
  return `about ${days} days`;
}

function buildLengthFact(length) {
  if (!length || Number.isNaN(Number(length))) {
    return null;
  }

  const meters = Number(length);
  const buses = Math.max(2, Math.round(meters / 12));
  return `At ${meters} meters long, she is about as long as ${buses} school buses parked in a row.`;
}

function buildAgeFact(yearBuilt) {
  if (!yearBuilt) {
    return null;
  }

  const age = new Date().getFullYear() - Number(yearBuilt);
  if (age <= 0) {
    return "This ship is brand new and recently joined the seas.";
  }
  if (age === 1) {
    return "This ship is only one year old.";
  }
  return `This ship was built ${age} years ago and has sailed many miles since then.`;
}

function buildFunFact(ship) {
  if (ship.funFact) {
    return ship.funFact;
  }

  const facts = [
    buildLengthFact(ship.length),
    buildAgeFact(ship.yearBuilt),
    TYPE_FACTS[normalizeKey(ship.type)],
    FLAG_FACTS[normalizeKey(ship.flag)],
  ].filter(Boolean);

  return facts[0] || "Ships like this one help connect countries by carrying people and cargo across the sea.";
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().trim();
}

function formatPortEvent(eventType, portName) {
  const event = String(eventType || "visit").toLowerCase();
  if (event.includes("depart")) {
    return `leaving the port of ${portName}`;
  }
  if (event.includes("arriv")) {
    return `arriving at the port of ${portName}`;
  }
  return `visiting the port of ${portName}`;
}

export function buildIntroScript(location) {
  const place = [location.city, location.region].filter(Boolean).join(", ");
  if (place) {
    return `Ahoy, ship spotters! Scanning the waters near ${place}. Let's listen for nearby vessels and learn all about them.`;
  }

  return "Ahoy, ship spotters! Scanning the waters around you. Let's listen for nearby vessels and learn all about them.";
}

export function buildTransitionScript(index) {
  const phrases = [
    "Still listening on the radio. Here comes another ship.",
    "The scanner is picking up another vessel nearby.",
    "Hold on, I'm tuning in to one more ship on the horizon.",
  ];

  return phrases[(index - 1) % phrases.length];
}

export function buildOutroScript() {
  return "That's all for this ship scan. Over and out, captain!";
}

export function buildShipScript(ship) {
  const typeLabel = formatType(ship.type);
  const flagLabel = ship.flag || "an unknown country";
  const portEvent = formatPortEvent(ship.lastPortEvent, ship.lastPort);
  const destination = ship.destination || "her next port";
  const etaLabel = formatEtaDays(ship.etaDays);
  const funFact = buildFunFact(ship);

  return [
    `Ahoy! I've spotted a ship called the ${ship.name}.`,
    `She's a ${typeLabel} flying the flag of ${flagLabel}.`,
    `Her crew last reported ${portEvent}.`,
    `She's heading next to ${destination}, and should arrive in ${etaLabel}.`,
    `Fun fact: ${funFact}`,
  ].join(" ");
}

export function buildScanPreview(location, ships) {
  return {
    location,
    ships: ships.map((ship) => ({
      ...ship,
      script: buildShipScript(ship),
    })),
    introScript: buildIntroScript(location),
    outroScript: buildOutroScript(),
  };
}
